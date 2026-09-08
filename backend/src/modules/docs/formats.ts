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

export function getExtension(filename: string): string {
  const lower = filename.toLowerCase()
  const dot = lower.lastIndexOf('.')
  return dot >= 0 ? lower.slice(dot) : ''
}

export function isSupportedDoc(filename: string): boolean {
  return (DOC_EXTENSIONS as readonly string[]).includes(getExtension(filename))
}
