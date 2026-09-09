import { supabaseAdmin } from './supabase.js'
import { embedTexts } from './openai.js'
import { chunkText } from '../modules/docs/chunk.js'
import { extractText } from '../modules/docs/extract.js'

const CHUNK_INSERT_BATCH = 100

/** Download document from storage, extract, embed, persist chunks. */
export async function processDocumentIngest(documentId: string): Promise<void> {
  const { data: doc, error } = await supabaseAdmin
    .from('documents')
    .select('id, bot_id, filename, storage_path, status')
    .eq('id', documentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!doc) throw new Error('Document not found')

  await supabaseAdmin
    .from('documents')
    .update({ status: 'processing', error_message: null })
    .eq('id', documentId)

  const { data: file, error: downloadError } = await supabaseAdmin.storage
    .from('documents')
    .download(doc.storage_path)

  if (downloadError || !file) {
    throw new Error(downloadError?.message || 'Could not download original file')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  await supabaseAdmin.from('chunks').delete().eq('document_id', documentId)

  const text = await extractText(doc.filename, buffer)
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
        bot_id: doc.bot_id,
        content,
        embedding: `[${embeddings[j].join(',')}]` as unknown as number[],
        metadata: { filename: doc.filename, chunk_index: index },
        chunk_index: index,
      })
    })
  }

  for (let i = 0; i < rows.length; i += CHUNK_INSERT_BATCH) {
    const slice = rows.slice(i, i + CHUNK_INSERT_BATCH)
    const { error: insertError } = await supabaseAdmin.from('chunks').insert(slice)
    if (insertError) throw new Error(insertError.message)
  }

  await supabaseAdmin
    .from('documents')
    .update({ status: 'ready', error_message: null })
    .eq('id', documentId)
}

export async function markDocumentFailed(documentId: string, message: string): Promise<void> {
  await supabaseAdmin
    .from('documents')
    .update({ status: 'failed', error_message: message.slice(0, 500) })
    .eq('id', documentId)
}
