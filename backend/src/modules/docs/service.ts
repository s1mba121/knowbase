import { supabaseAdmin } from '../../lib/supabase.js'
import { embedTexts } from '../../lib/openai.js'
import { httpError } from '../../plugins/error-handler.js'
import { assertCanUploadDoc } from '../../lib/usage.js'
import { scheduleIngest } from '../../lib/ingest-queue.js'
import { getBot } from '../bots/service.js'
import { extractText } from './extract.js'
import { chunkText } from './chunk.js'
import { assertFileLooksValid } from './formats.js'

const CHUNK_INSERT_BATCH = 100

export async function listDocuments(userId: string, botId: string) {
  await getBot(userId, botId)
  const { data, error } = await supabaseAdmin
    .from('documents')
    .select('id, bot_id, filename, status, bytes, error_message, created_at, updated_at')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw httpError(500, 'Failed to list documents')
  return data
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
    .select('*')
    .single()

  if (insertError) {
    await supabaseAdmin.storage.from('documents').remove([storagePath])
    throw httpError(500, 'Failed to create document record')
  }

  // Return immediately; extract + embed off the request path (bounded concurrency)
  scheduleIngest(async () => {
    try {
      await ingestDocument(doc.id, botId, filename, buffer)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ingest failed'
      await supabaseAdmin
        .from('documents')
        .update({ status: 'failed', error_message: message.slice(0, 500) })
        .eq('id', doc.id)
    }
  })

  return doc
}

async function ingestDocument(documentId: string, botId: string, filename: string, buffer: Buffer) {
  const text = await extractText(filename, buffer)
  if (!text.trim()) {
    throw new Error('No extractable text found in file')
  }

  const chunks = chunkText(text)
  if (chunks.length === 0) throw new Error('Document produced no chunks')

  const batchSize = 32
  const rows: Array<{
    document_id: string
    bot_id: string
    content: string
    embedding: number[]
    metadata: Record<string, unknown>
    chunk_index: number
  }> = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const embeddings = await embedTexts(batch)
    batch.forEach((content, j) => {
      const index = i + j
      rows.push({
        document_id: documentId,
        bot_id: botId,
        content,
        embedding: `[${embeddings[j].join(',')}]` as unknown as number[],
        metadata: { filename, chunk_index: index },
        chunk_index: index,
      })
    })
  }

  for (let i = 0; i < rows.length; i += CHUNK_INSERT_BATCH) {
    const slice = rows.slice(i, i + CHUNK_INSERT_BATCH)
    const { error } = await supabaseAdmin.from('chunks').insert(slice)
    if (error) throw new Error(error.message)
  }

  await supabaseAdmin
    .from('documents')
    .update({ status: 'ready', error_message: null })
    .eq('id', documentId)
}

export async function deleteDocument(userId: string, botId: string, documentId: string) {
  await getBot(userId, botId)
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('*')
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
    .select('*')
    .eq('id', documentId)
    .eq('bot_id', botId)
    .maybeSingle()

  if (error) throw httpError(500, error.message)
  if (!doc) throw httpError(404, 'Document not found')
  if (doc.status !== 'failed') {
    throw httpError(400, 'Only failed documents can be retried')
  }

  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(doc.storage_path)

  if (downloadError || !file) {
    throw httpError(500, downloadError?.message || 'Could not download original file')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await supabaseAdmin.from('chunks').delete().eq('document_id', documentId)
  await supabaseAdmin
    .from('documents')
    .update({ status: 'processing', error_message: null })
    .eq('id', documentId)

  scheduleIngest(async () => {
    try {
      await ingestDocument(doc.id, botId, doc.filename, buffer)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ingest failed'
      await supabaseAdmin
        .from('documents')
        .update({ status: 'failed', error_message: message.slice(0, 500) })
        .eq('id', documentId)
    }
  })

  const { data: refreshed } = await supabaseAdmin.from('documents').select('*').eq('id', doc.id).single()
  return refreshed ?? { ...doc, status: 'processing', error_message: null }
}
