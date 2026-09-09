import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { assertFileLooksValid } from '../src/modules/docs/formats.js'

describe('upload validation', () => {
  it('accepts markdown', () => {
    const buf = Buffer.from('# Hello\n\nDocs body\n')
    assert.doesNotThrow(() => assertFileLooksValid('guide.md', buf, 'text/markdown'))
  })

  it('rejects unsupported extensions', () => {
    assert.throws(
      () => assertFileLooksValid('virus.exe', Buffer.from('MZ'), 'application/octet-stream'),
      (err: Error & { statusCode?: number }) => err.statusCode === 400,
    )
  })

  it('rejects pdf without magic bytes', () => {
    assert.throws(
      () => assertFileLooksValid('fake.pdf', Buffer.from('not-a-pdf'), 'application/pdf'),
      (err: Error & { statusCode?: number }) => err.statusCode === 400,
    )
  })
})
