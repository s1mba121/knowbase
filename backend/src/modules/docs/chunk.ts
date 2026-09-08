export function chunkText(text: string, chunkSize = 1200, overlap = 200): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!cleaned) return []

  const chunks: string[] = []
  let start = 0
  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length)
    if (end < cleaned.length) {
      const slice = cleaned.slice(start, end)
      const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '), slice.lastIndexOf('\n'))
      if (lastBreak > chunkSize * 0.4) {
        end = start + lastBreak + 1
      }
    }
    const chunk = cleaned.slice(start, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= cleaned.length) break
    start = Math.max(0, end - overlap)
  }
  return chunks
}
