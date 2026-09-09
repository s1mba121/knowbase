import { supabaseAdmin } from '../../lib/supabase.js'
import { embedQuery, openai, CHAT_MODEL } from '../../lib/openai.js'
import { httpError } from '../../plugins/error-handler.js'
import { consumeMessageOrThrow } from '../../lib/usage.js'
import { getBot } from '../bots/service.js'

type MatchedChunk = {
  id: string
  content: string
  metadata: Record<string, unknown> | null
  similarity: number
  document_id: string
}

type ChatSource = {
  index: number
  chunk_id: string
  document_id: string
  filename: string | null
  excerpt: string
  similarity: number
}

type PreparedRag = {
  conversationId: string
  ownerId: string
  sources: ChatSource[]
  llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
}

export async function matchChunks(botId: string, embedding: number[], matchCount = 6): Promise<MatchedChunk[]> {
  const { data, error } = await supabaseAdmin.rpc('match_chunks', {
    query_embedding: `[${embedding.join(',')}]`,
    match_bot_id: botId,
    match_count: matchCount,
  })

  if (error) throw httpError(500, error.message)
  return (data ?? []) as MatchedChunk[]
}

async function prepareRag(opts: {
  bot: {
    id: string
    owner_id: string
    system_prompt: string
    name: string
  }
  message: string
  conversationId?: string | null
  channel: 'app' | 'widget'
  visitorId?: string | null
}): Promise<PreparedRag> {
  let conversationId = opts.conversationId ?? null

  if (conversationId) {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id, bot_id, channel, visitor_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (!conv || conv.bot_id !== opts.bot.id) {
      throw httpError(404, 'Conversation not found')
    }
    if (opts.channel === 'widget') {
      if (conv.channel !== 'widget') throw httpError(404, 'Conversation not found')
      if (conv.visitor_id && (!opts.visitorId || conv.visitor_id !== opts.visitorId)) {
        throw httpError(403, 'Conversation does not belong to this visitor')
      }
    }
  } else {
    const { data: conv, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        bot_id: opts.bot.id,
        channel: opts.channel,
        visitor_id: opts.visitorId ?? null,
        user_id: opts.channel === 'app' ? opts.bot.owner_id : null,
      })
      .select('id')
      .single()
    if (error) throw httpError(500, error.message)
    conversationId = conv.id
  }

  if (!conversationId) throw httpError(500, 'Failed to create conversation')

  // Reserve quota only after conversation is validated/created
  await consumeMessageOrThrow(opts.bot.owner_id)

  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: opts.message,
  })

  const HISTORY_LIMIT = 12
  const [embedding, historyResult] = await Promise.all([
    embedQuery(opts.message),
    supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT),
  ])

  if (historyResult.error) throw httpError(500, historyResult.error.message)

  const chunks = await matchChunks(opts.bot.id, embedding)

  const context = chunks
    .map((c, i) => `[Source ${i + 1}${c.metadata?.filename ? ` — ${c.metadata.filename}` : ''}]\n${c.content}`)
    .join('\n\n')

  const history = (historyResult.data ?? [])
    .reverse()
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  const sources = chunks.map((c, i) => ({
    index: i + 1,
    chunk_id: c.id,
    document_id: c.document_id,
    filename: (c.metadata?.filename as string) || null,
    excerpt: c.content.slice(0, 240),
    similarity: c.similarity,
  }))

  return {
    conversationId,
    ownerId: opts.bot.owner_id,
    sources,
    llmMessages: [
      {
        role: 'system',
        content: `${opts.bot.system_prompt}

You must ground answers in the CONTEXT below. Cite sources as [Source N] inline when you use them.
Use prior conversation turns for continuity, but prefer CONTEXT for factual claims.
If CONTEXT is empty or insufficient, say you don't know based on the docs.

CONTEXT:
${context || '(no matching documentation found)'}`,
      },
      ...history,
    ],
  }
}

async function finalizeAssistant(opts: {
  conversationId: string
  ownerId: string
  answer: string
  sources: ChatSource[]
}) {
  await Promise.all([
    supabaseAdmin.from('messages').insert({
      conversation_id: opts.conversationId,
      role: 'assistant',
      content: opts.answer,
      sources: opts.sources,
    }),
    supabaseAdmin
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', opts.conversationId),
  ])
}

export async function runRagChat(opts: {
  bot: {
    id: string
    owner_id: string
    system_prompt: string
    name: string
  }
  message: string
  conversationId?: string | null
  channel: 'app' | 'widget'
  visitorId?: string | null
}) {
  const prepared = await prepareRag(opts)

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: prepared.llmMessages,
  })

  const answer = completion.choices[0]?.message?.content?.trim() || "I couldn't generate an answer."
  await finalizeAssistant({
    conversationId: prepared.conversationId,
    ownerId: prepared.ownerId,
    answer,
    sources: prepared.sources,
  })

  return {
    conversation_id: prepared.conversationId,
    answer,
    sources: prepared.sources,
  }
}

export type StreamChatEvent =
  | { type: 'meta'; conversation_id: string; sources: ChatSource[] }
  | { type: 'token'; content: string }
  | { type: 'done'; answer: string }
  | { type: 'error'; error: string }

export async function* streamRagChat(opts: {
  bot: {
    id: string
    owner_id: string
    system_prompt: string
    name: string
  }
  message: string
  conversationId?: string | null
  channel: 'app' | 'widget'
  visitorId?: string | null
}): AsyncGenerator<StreamChatEvent> {
  const prepared = await prepareRag(opts)
  yield {
    type: 'meta',
    conversation_id: prepared.conversationId,
    sources: prepared.sources,
  }

  const stream = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    stream: true,
    messages: prepared.llmMessages,
  })

  let answer = ''
  for await (const part of stream) {
    const delta = part.choices[0]?.delta?.content
    if (delta) {
      answer += delta
      yield { type: 'token', content: delta }
    }
  }

  const finalAnswer = answer.trim() || "I couldn't generate an answer."
  await finalizeAssistant({
    conversationId: prepared.conversationId,
    ownerId: prepared.ownerId,
    answer: finalAnswer,
    sources: prepared.sources,
  })

  yield { type: 'done', answer: finalAnswer }
}

export async function chatInApp(
  userId: string,
  botId: string,
  message: string,
  conversationId?: string | null,
) {
  const bot = await getBot(userId, botId)
  return runRagChat({
    bot,
    message,
    conversationId,
    channel: 'app',
  })
}

export async function* streamChatInApp(
  userId: string,
  botId: string,
  message: string,
  conversationId?: string | null,
) {
  const bot = await getBot(userId, botId)
  yield* streamRagChat({
    bot,
    message,
    conversationId,
    channel: 'app',
  })
}

export async function listConversations(
  userId: string,
  botId: string,
  channel: 'app' | 'widget' = 'app',
) {
  await getBot(userId, botId)

  const { data, error } = await supabaseAdmin.rpc('list_bot_conversations', {
    p_bot_id: botId,
    p_channel: channel,
    p_limit: 50,
  })

  if (error) {
    // Fallback before migration 003 is applied
    console.warn('[chat] list_bot_conversations RPC unavailable:', error.message)
    const { data: rows, error: fallbackError } = await supabaseAdmin
      .from('conversations')
      .select('id, channel, visitor_id, created_at, updated_at')
      .eq('bot_id', botId)
      .eq('channel', channel)
      .order('updated_at', { ascending: false })
      .limit(50)
    if (fallbackError) throw httpError(500, fallbackError.message)
    return (rows ?? []).map((row) => ({
      ...row,
      visitor_id: row.visitor_id ?? null,
      preview: 'Chat',
      message_count: 0,
    }))
  }

  return (data ?? []).map(
    (row: {
      id: string
      channel: string
      visitor_id: string | null
      created_at: string
      updated_at: string
      preview: string
      message_count: number | string
    }) => ({
      id: row.id,
      channel: row.channel,
      visitor_id: row.visitor_id ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      preview: row.preview || 'New chat',
      message_count: Number(row.message_count ?? 0),
    }),
  )
}

export async function getConversationMessages(userId: string, botId: string, conversationId: string) {
  await getBot(userId, botId)
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('bot_id', botId)
    .maybeSingle()
  if (!conv) throw httpError(404, 'Conversation not found')

  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, role, content, sources, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) throw httpError(500, error.message)
  return data
}

export async function deleteConversation(userId: string, botId: string, conversationId: string) {
  await getBot(userId, botId)
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('id, channel')
    .eq('id', conversationId)
    .eq('bot_id', botId)
    .maybeSingle()
  if (!conv) throw httpError(404, 'Conversation not found')

  const { error } = await supabaseAdmin.from('conversations').delete().eq('id', conversationId)
  if (error) throw httpError(500, error.message)
  return { ok: true }
}
