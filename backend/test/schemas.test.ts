import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { createBotSchema, updateBotSchema } from '../src/modules/bots/schema.js'
import { chatSchema } from '../src/modules/chat/schema.js'
import { widgetChatSchema } from '../src/modules/widget/schema.js'

describe('chatSchema', () => {
  it('accepts a valid message', () => {
    const parsed = chatSchema.parse({ message: 'hello' })
    assert.equal(parsed.message, 'hello')
  })

  it('rejects empty message', () => {
    assert.throws(() => chatSchema.parse({ message: '' }))
  })

  it('rejects invalid conversation uuid', () => {
    assert.throws(() => chatSchema.parse({ message: 'hi', conversation_id: 'not-a-uuid' }))
  })
})

describe('widgetChatSchema', () => {
  it('accepts visitor_id', () => {
    const parsed = widgetChatSchema.parse({
      message: 'what is this?',
      visitor_id: 'v_abc',
    })
    assert.equal(parsed.visitor_id, 'v_abc')
  })

  it('allows null conversation_id', () => {
    const parsed = widgetChatSchema.parse({ message: 'hi', conversation_id: null })
    assert.equal(parsed.conversation_id, null)
  })

  it('rejects oversized visitor_id', () => {
    assert.throws(() =>
      widgetChatSchema.parse({ message: 'hi', visitor_id: 'x'.repeat(101) }),
    )
  })
})

describe('createBotSchema', () => {
  it('applies defaults for prompt, welcome, and color', () => {
    const parsed = createBotSchema.parse({ name: 'Support' })
    assert.equal(parsed.name, 'Support')
    assert.ok(parsed.system_prompt.length > 0)
    assert.ok(parsed.welcome_message.length > 0)
    assert.match(parsed.primary_color, /^#[0-9A-Fa-f]{6}$/)
  })

  it('rejects invalid primary_color', () => {
    assert.throws(() => createBotSchema.parse({ name: 'X', primary_color: 'teal' }))
  })
})

describe('updateBotSchema', () => {
  it('accepts partial updates', () => {
    const parsed = updateBotSchema.parse({ is_published: true, name: 'Renamed' })
    assert.equal(parsed.is_published, true)
    assert.equal(parsed.name, 'Renamed')
  })

  it('rejects empty name when provided', () => {
    assert.throws(() => updateBotSchema.parse({ name: '' }))
  })
})
