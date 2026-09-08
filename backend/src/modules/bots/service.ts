import { customAlphabet } from 'nanoid'
import { supabaseAdmin } from '../../lib/supabase.js'
import { httpError } from '../../plugins/error-handler.js'
import { assertCanCreateBot, getUserPlan } from '../../lib/usage.js'
import type { z } from 'zod'
import type { createBotSchema, updateBotSchema } from './schema.js'

const publicKey = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 24)

export async function listBots(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('bots')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw httpError(500, error.message)
  return data
}

export async function getBot(userId: string, botId: string) {
  const { data, error } = await supabaseAdmin
    .from('bots')
    .select('*')
    .eq('id', botId)
    .eq('owner_id', userId)
    .maybeSingle()

  if (error) throw httpError(500, error.message)
  if (!data) throw httpError(404, 'Bot not found')
  return data
}

export async function createBot(userId: string, input: z.infer<typeof createBotSchema>) {
  await assertCanCreateBot(userId)

  const { data, error } = await supabaseAdmin
    .from('bots')
    .insert({
      owner_id: userId,
      name: input.name,
      system_prompt: input.system_prompt,
      welcome_message: input.welcome_message,
      primary_color: input.primary_color,
      public_key: `pk_${publicKey()}`,
      is_published: false,
    })
    .select('*')
    .single()

  if (error) throw httpError(500, error.message)
  return data
}

export async function updateBot(
  userId: string,
  botId: string,
  input: z.infer<typeof updateBotSchema>,
) {
  await getBot(userId, botId)
  const plan = await getUserPlan(userId)

  const patch: Record<string, unknown> = { ...input }

  if (!plan.branding) {
    if (input.primary_color && input.primary_color !== '#0F766E') {
      throw httpError(402, 'Custom branding requires Pro or Business plan.')
    }
    if (input.welcome_message !== undefined) {
      // allow default-ish welcome on free
    }
  }

  const { data, error } = await supabaseAdmin
    .from('bots')
    .update(patch)
    .eq('id', botId)
    .eq('owner_id', userId)
    .select('*')
    .single()

  if (error) throw httpError(500, error.message)
  return data
}

export async function deleteBot(userId: string, botId: string) {
  await getBot(userId, botId)

  const { data: docs } = await supabaseAdmin.from('documents').select('storage_path').eq('bot_id', botId)
  if (docs?.length) {
    await supabaseAdmin.storage.from('documents').remove(docs.map((d) => d.storage_path))
  }

  const { error } = await supabaseAdmin.from('bots').delete().eq('id', botId).eq('owner_id', userId)
  if (error) throw httpError(500, error.message)
  return { ok: true }
}

export async function getBotByPublicKey(publicKeyValue: string) {
  const { data, error } = await supabaseAdmin
    .from('bots')
    .select('*')
    .eq('public_key', publicKeyValue)
    .eq('is_published', true)
    .maybeSingle()

  if (error) throw httpError(500, error.message)
  if (!data) throw httpError(404, 'Widget not found or bot not published')
  return data
}
