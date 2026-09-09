export const DOC_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.markdown',
  '.html',
  '.htm',
  '.csv',
] as const

export type DocExtension = (typeof DOC_EXTENSIONS)[number]

export const DOC_FORMATS_LABEL = 'PDF, DOCX, Markdown, TXT, HTML, or CSV'

const EXT_MIME: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/octet-stream',
  ],
  '.txt': ['text/plain', 'application/octet-stream'],
  '.md': ['text/plain', 'text/markdown', 'application/octet-stream'],
  '.markdown': ['text/plain', 'text/markdown', 'application/octet-stream'],
  '.html': ['text/html', 'application/octet-stream'],
  '.htm': ['text/html', 'application/octet-stream'],
  '.csv': ['text/csv', 'text/plain', 'application/csv', 'application/octet-stream'],
}

export function getExtension(filename: string): string {
  const lower = filename.toLowerCase()
  const dot = lower.lastIndexOf('.')
  return dot >= 0 ? lower.slice(dot) : ''
}

export function isSupportedDoc(filename: string): boolean {
  return (DOC_EXTENSIONS as readonly string[]).includes(getExtension(filename))
}

/** Soft MIME allowlist (browsers often send octet-stream). */
export function isAllowedMime(filename: string, mimeType: string): boolean {
  const ext = getExtension(filename)
  const allowed = EXT_MIME[ext]
  if (!allowed) return false
  if (!mimeType) return true
  return allowed.includes(mimeType.toLowerCase())
}

function hasPdfMagic(buf: Buffer): boolean {
  return buf.length >= 5 && buf.subarray(0, 5).toString('utf8') === '%PDF-'
}

function hasZipMagic(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && (buf[2] === 0x03 || buf[2] === 0x05 || buf[2] === 0x07)
}

/** Reject obvious mismatches before storage/parse. */
export function assertFileLooksValid(filename: string, buffer: Buffer, mimeType: string): void {
  if (!isSupportedDoc(filename)) {
    throw Object.assign(new Error(`Unsupported file type. Upload ${DOC_FORMATS_LABEL}.`), {
      statusCode: 400,
    })
  }
  if (!isAllowedMime(filename, mimeType)) {
    throw Object.assign(new Error(`MIME type not allowed for this extension (${mimeType || 'unknown'}).`), {
      statusCode: 400,
    })
  }

  const ext = getExtension(filename)
  if (ext === '.pdf' && !hasPdfMagic(buffer)) {
    throw Object.assign(new Error('File does not look like a valid PDF.'), { statusCode: 400 })
  }
  if (ext === '.docx' && !hasZipMagic(buffer)) {
    throw Object.assign(new Error('File does not look like a valid DOCX.'), { statusCode: 400 })
  }
}
