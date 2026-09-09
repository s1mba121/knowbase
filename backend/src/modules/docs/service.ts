import { supabaseAdmin } from '../../lib/supabase.js'
import { httpError } from '../../plugins/error-handler.js'
import { assertCanUploadDoc } from '../../lib/usage.js'
import { canAcceptIngestJob, enqueueIngestJob } from '../../lib/ingest-jobs.js'
import { clampLimit } from '../../lib/pagination.js'
import { getBot } from '../bots/service.js'
import { assertFileLooksValid } from './formats.js'

const DOC_SELECT =
  'id, bot_id, filename, status, bytes, error_message, created_at, updated_at'

export async function listDocuments(
  userId: string,
  botId: string,
  opts?: { limit?: number; cursor?: string | null },
) {
  await getBot(userId, botId)
  const limit = clampLimit(opts?.limit, 50, 100)

  let query = supabaseAdmin
    .from('documents')
    .select(DOC_SELECT)
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (opts?.cursor) {
    query = query.lt('created_at', opts.cursor)
  }

  const { data, error } = await query
  if (error) throw httpError(500, 'Failed to list documents')

  const rows = data ?? []
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return {
    items,
    next_cursor: hasMore ? items[items.length - 1]?.created_at ?? null : null,
  }
}

export async function uploadAndIngest(
  userId: string,
  botId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string,
) {
  await getBot(userId, botId)

  try {
    assertFileLooksValid(filename, buffer, mimeType)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid file'
    const status = (err as { statusCode?: number }).statusCode ?? 400
    throw httpError(status, message)
  }

  await assertCanUploadDoc(userId, botId, buffer.byteLength)

  const accepted = await canAcceptIngestJob()
  if (!accepted) {
    throw httpError(503, 'Document processing queue is full. Please retry in a moment.')
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${userId}/${botId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('documents')
    .upload(storagePath, buffer, { contentType: mimeType || 'application/octet-stream', upsert: false })

  if (uploadError) throw httpError(500, 'Failed to upload file')

  const { data: doc, error: insertError } = await supabaseAdmin
    .from('documents')
    .insert({
      bot_id: botId,
      filename: filename.slice(0, 255),
      storage_path: storagePath,
      status: 'processing',
      bytes: buffer.byteLength,
    })
    .select(DOC_SELECT)
    .single()

  if (insertError) {
    await supabaseAdmin.storage.from('documents').remove([storagePath])
    throw httpError(500, 'Failed to create document record')
  }

  try {
    await enqueueIngestJob(doc.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue ingest'
    await supabaseAdmin
      .from('documents')
      .update({ status: 'failed', error_message: message.slice(0, 500) })
      .eq('id', doc.id)
    throw httpError(500, 'Failed to queue document for processing (run migration 004?)')
  }

  return doc
}

export async function deleteDocument(userId: string, botId: string, documentId: string) {
  await getBot(userId, botId)
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('id, storage_path')
    .eq('id', documentId)
    .eq('bot_id', botId)
    .maybeSingle()

  if (error) throw httpError(500, error.message)
  if (!doc) throw httpError(404, 'Document not found')

  await supabaseAdmin.from('chunks').delete().eq('document_id', documentId)
  await supabaseAdmin.storage.from('documents').remove([doc.storage_path])
  await supabaseAdmin.from('documents').delete().eq('id', documentId)

  return { ok: true }
}

export async function retryDocument(userId: string, botId: string, documentId: string) {
  await getBot(userId, botId)
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select(DOC_SELECT)
    .eq('id', documentId)
    .eq('bot_id', botId)
    .maybeSingle()

  if (error) throw httpError(500, error.message)
  if (!doc) throw httpError(404, 'Document not found')
  if (doc.status !== 'failed') {
    throw httpError(400, 'Only failed documents can be retried')
  }

  const accepted = await canAcceptIngestJob()
  if (!accepted) {
    throw httpError(503, 'Document processing queue is full. Please retry in a moment.')
  }

  await supabaseAdmin.from('chunks').delete().eq('document_id', documentId)
  await supabaseAdmin
    .from('documents')
    .update({ status: 'processing', error_message: null })
    .eq('id', documentId)

  try {
    await enqueueIngestJob(documentId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to enqueue ingest'
    await supabaseAdmin
      .from('documents')
      .update({ status: 'failed', error_message: message.slice(0, 500) })
      .eq('id', documentId)
    throw httpError(500, message)
  }

  const { data: refreshed } = await supabaseAdmin
    .from('documents')
    .select(DOC_SELECT)
    .eq('id', documentId)
    .single()
  return refreshed ?? { ...doc, status: 'processing', error_message: null }
}
