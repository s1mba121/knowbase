import { createRequire } from 'node:module'
import { httpError } from '../../plugins/error-handler.js'
import { DOC_FORMATS_LABEL, getExtension, isSupportedDoc } from './formats.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
const mammoth = require('mammoth') as {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  if (!isSupportedDoc(filename)) {
    throw httpError(400, `Unsupported file type. Upload ${DOC_FORMATS_LABEL}.`)
  }

  const ext = getExtension(filename)

  if (ext === '.pdf') {
    const parsed = await pdfParse(buffer)
    return parsed.text ?? ''
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value ?? ''
  }

  if (ext === '.html' || ext === '.htm') {
    return stripHtml(buffer.toString('utf8'))
  }

  // .txt, .md, .markdown, .csv
  return buffer.toString('utf8')
}
