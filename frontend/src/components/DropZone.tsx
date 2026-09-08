import { useRef, useState, type DragEvent, type ChangeEvent } from 'react'

type DropZoneProps = {
  disabled?: boolean
  busy?: boolean
  accept?: string
  onFile: (file: File) => void
  hint?: string
}

const EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.html', '.htm', '.csv'] as const

const MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/csv',
])

const DEFAULT_ACCEPT = [
  ...EXTENSIONS,
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
].join(',')

const FORMATS_HINT = 'PDF, DOCX, Markdown, TXT, HTML, CSV · max 20 MB'
const FORMATS_ERROR = 'Unsupported file type. Upload PDF, DOCX, Markdown, TXT, HTML, or CSV.'

export function DropZone({
  disabled,
  busy,
  accept = DEFAULT_ACCEPT,
  onFile,
  hint = FORMATS_HINT,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function isAllowed(file: File) {
    const name = file.name.toLowerCase()
    if (EXTENSIONS.some((ext) => name.endsWith(ext))) return true
    return MIME_TYPES.has(file.type)
  }

  function handleFiles(list: FileList | null) {
    const file = list?.[0]
    if (!file) return
    if (!isAllowed(file)) {
      alert(FORMATS_ERROR)
      return
    }
    onFile(file)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !busy) setDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (disabled || busy) return
    handleFiles(e.dataTransfer.files)
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`group relative w-full rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
        dragging
          ? 'border-teal bg-teal/10 scale-[1.01]'
          : 'border-line bg-white/80 hover:border-teal/50 hover:bg-mist/40'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        disabled={disabled || busy}
        onChange={onChange}
      />
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-mist text-teal transition group-hover:bg-teal group-hover:text-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 16V4m0 0l-4 4m4-4l4 4M4 16.5V18a2 2 0 002 2h12a2 2 0 002-2v-1.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-sm font-semibold text-ink">
        {busy ? 'Uploading & embedding…' : dragging ? 'Drop to upload' : 'Drag & drop a file here'}
      </p>
      <p className="mt-1 text-xs text-ink/50">
        {busy ? 'This can take a few seconds for larger docs.' : `or click to browse · ${hint}`}
      </p>
    </button>
  )
}
