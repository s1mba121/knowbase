import { hostname } from 'node:os'
import { config } from '../config.js'
import { formatError } from './errors.js'
import { supabaseAdmin } from './supabase.js'

export type IngestJob = {
  id: string
  document_id: string
  status: 'queued' | 'running' | 'done' | 'failed'
  attempts: number
  max_attempts: number
  available_at: string
  locked_at: string | null
  locked_by: string | null
  last_error: string | null
}

export function defaultWorkerId(prefix = 'api') {
  return `${prefix}:${hostname()}:${process.pid}`
}

export async function countActiveIngestJobs(): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc('count_active_ingest_jobs')
  if (error) {
    console.warn('[ingest] count_active_ingest_jobs unavailable:', formatError(error))
    return null
  }
  return Number(data ?? 0)
}

export async function canAcceptIngestJob(): Promise<boolean> {
  const count = await countActiveIngestJobs()
  if (count === null) return true
  return count < config.INGEST_MAX_QUEUED
}

export async function enqueueIngestJob(documentId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('ingest_jobs').insert({
    document_id: documentId,
    status: 'queued',
    available_at: new Date().toISOString(),
  })

  if (error) {
    // Unique partial index: already queued/running for this doc
    if (error.code === '23505') return
    throw error
  }
}

export async function claimIngestJobs(
  workerId: string,
  limit = 1,
): Promise<IngestJob[]> {
  const { data, error } = await supabaseAdmin.rpc('claim_ingest_jobs', {
    p_worker_id: workerId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as IngestJob[]
}

export async function requeueStaleIngestJobs(staleSeconds = 600): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('requeue_stale_ingest_jobs', {
    p_stale_seconds: staleSeconds,
  })
  if (error) {
    console.warn('[ingest] requeue_stale_ingest_jobs unavailable:', formatError(error))
    return 0
  }
  return Number(data ?? 0)
}

export async function completeIngestJob(jobId: string): Promise<void> {
  await supabaseAdmin
    .from('ingest_jobs')
    .update({
      status: 'done',
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq('id', jobId)
}

export async function failIngestJob(job: IngestJob, message: string): Promise<void> {
  const giveUp = job.attempts >= job.max_attempts
  if (giveUp) {
    await supabaseAdmin
      .from('ingest_jobs')
      .update({
        status: 'failed',
        locked_at: null,
        locked_by: null,
        last_error: message.slice(0, 500),
      })
      .eq('id', job.id)
    return
  }

  const backoffSec = Math.min(300, 5 * 2 ** Math.max(0, job.attempts - 1))
  await supabaseAdmin
    .from('ingest_jobs')
    .update({
      status: 'queued',
      locked_at: null,
      locked_by: null,
      last_error: message.slice(0, 500),
      available_at: new Date(Date.now() + backoffSec * 1000).toISOString(),
    })
    .eq('id', job.id)
}

export async function getIngestQueueSnapshot() {
  const active = await countActiveIngestJobs()
  if (active === null) {
    return {
      activeTotal: null as number | null,
      queued: 0,
      running: 0,
      maxQueued: config.INGEST_MAX_QUEUED,
      maxConcurrent: config.INGEST_CONCURRENCY,
      migrationRequired: true,
    }
  }

  const { count: queued } = await supabaseAdmin
    .from('ingest_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'queued')
  const { count: running } = await supabaseAdmin
    .from('ingest_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'running')

  return {
    activeTotal: active,
    queued: queued ?? 0,
    running: running ?? 0,
    maxQueued: config.INGEST_MAX_QUEUED,
    maxConcurrent: config.INGEST_CONCURRENCY,
  }
}
