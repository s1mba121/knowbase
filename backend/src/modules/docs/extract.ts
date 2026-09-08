import { createRequire } from 'node:module'
import { httpError } from '../../plugins/error-handler.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf')) {
    const parsed = await pdfParse(buffer)
    return parsed.text ?? ''
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.markdown')) {
    return buffer.toString('utf8')
  }
  throw httpError(400, 'Unsupported file type. Upload PDF, TXT, or Markdown.')
}
