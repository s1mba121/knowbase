import { createRequire } from 'node:module'
import { httpError } from '../../plugins/error-handler.js'
import { DOC_FORMATS_LABEL, getExtension, isSupportedDoc } from './formats.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
const mammoth = require('mammoth') as {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>
}

const MAX_EXTRACT_CHARS = 500_000
const EXTRACT_TIMEOUT_MS = 20_000

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

function truncate(text: string): string {
  if (text.length <= MAX_EXTRACT_CHARS) return text
  return text.slice(0, MAX_EXTRACT_CHARS)
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function extractText(filename: string, buffer: Buffer): Promise<string> {
  if (!isSupportedDoc(filename)) {
    throw httpError(400, `Unsupported file type. Upload ${DOC_FORMATS_LABEL}.`)
  }

  const ext = getExtension(filename)

  if (ext === '.pdf') {
    const parsed = await withTimeout(pdfParse(buffer), EXTRACT_TIMEOUT_MS, 'PDF extract')
    return truncate(parsed.text ?? '')
  }

  if (ext === '.docx') {
    const result = await withTimeout(
      mammoth.extractRawText({ buffer }),
      EXTRACT_TIMEOUT_MS,
      'DOCX extract',
    )
    return truncate(result.value ?? '')
  }

  if (ext === '.html' || ext === '.htm') {
    return truncate(stripHtml(buffer.toString('utf8')))
  }

  // .txt, .md, .markdown, .csv
  return truncate(buffer.toString('utf8'))
}
