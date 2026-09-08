import { supabaseAdmin } from '../../lib/supabase.js'
import { embedQuery, openai, CHAT_MODEL } from '../../lib/openai.js'
import { httpError } from '../../plugins/error-handler.js'
import { assertCanSendMessage, incrementMessageUsage } from '../../lib/usage.js'
import { getBot } from '../bots/service.js'

type MatchedChunk = {
  id: string
  content: string
  metadata: Record<string, unknown> | null
  similarity: number
  document_id: string
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
  await assertCanSendMessage(opts.bot.owner_id)

  let conversationId = opts.conversationId ?? null

  if (conversationId) {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id, bot_id')
      .eq('id', conversationId)
      .maybeSingle()
    if (!conv || conv.bot_id !== opts.bot.id) {
      throw httpError(404, 'Conversation not found')
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

  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: opts.message,
  })

  const embedding = await embedQuery(opts.message)
  const chunks = await matchChunks(opts.bot.id, embedding)

  const context = chunks
    .map((c, i) => `[Source ${i + 1}${c.metadata?.filename ? ` — ${c.metadata.filename}` : ''}]\n${c.content}`)
    .join('\n\n')

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `${opts.bot.system_prompt}

You must ground answers in the CONTEXT below. Cite sources as [Source N] inline when you use them.
If CONTEXT is empty or insufficient, say you don't know based on the docs.

CONTEXT:
${context || '(no matching documentation found)'}`,
      },
      { role: 'user', content: opts.message },
    ],
  })

  const answer = completion.choices[0]?.message?.content?.trim() || "I couldn't generate an answer."

  const sources = chunks.map((c, i) => ({
    index: i + 1,
    chunk_id: c.id,
    document_id: c.document_id,
    filename: (c.metadata?.filename as string) || null,
    excerpt: c.content.slice(0, 240),
    similarity: c.similarity,
  }))

  await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: answer,
    sources,
  })

  await incrementMessageUsage(opts.bot.owner_id, 1)

  return {
    conversation_id: conversationId,
    answer,
    sources,
  }
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

export async function listConversations(userId: string, botId: string) {
  await getBot(userId, botId)
  const { data, error } = await supabaseAdmin
    .from('conversations')
    .select('id, channel, created_at, updated_at')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw httpError(500, error.message)
  return data
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

  if (error) throw httpError(500, error.message)
  return data
}
