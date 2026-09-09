import { supabaseAdmin } from './supabase.js'
import { PLANS, type PlanId, type PlanLimits } from './plans.js'
import { httpError } from '../plugins/error-handler.js'
import { TtlCache } from './ttl-cache.js'

const planCache = new TtlCache<PlanLimits>(15_000, 1000)

export async function getUserPlan(userId: string): Promise<PlanLimits> {
  const cached = planCache.get(userId)
  if (cached) return cached

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) {
    planCache.set(userId, PLANS.free)
    return PLANS.free
  }

  const active = data.status === 'active' || data.status === 'trialing'
  const planId = (active ? (data.plan as PlanId) : 'free') || 'free'
  const plan = PLANS[planId] ?? PLANS.free
  planCache.set(userId, plan)
  return plan
}

export function invalidateUserPlanCache(userId: string): void {
  planCache.delete(userId)
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function getMessageUsage(userId: string): Promise<number> {
  const month = currentMonthKey()
  const { data } = await supabaseAdmin
    .from('usage_monthly')
    .select('messages_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()
  return data?.messages_count ?? 0
}

/** Atomically consume one message against the plan limit. Returns false if over quota. */
export async function tryConsumeMessage(userId: string, limit: number): Promise<boolean> {
  const month = currentMonthKey()
  const { data, error } = await supabaseAdmin.rpc('consume_message_quota', {
    p_user_id: userId,
    p_month: month,
    p_limit: limit,
  })

  if (error) {
    // Fallback if migration 002 is not applied yet (non-atomic but still gates)
    console.warn('[usage] consume_message_quota RPC unavailable, using fallback:', error.message)
    const used = await getMessageUsage(userId)
    if (used >= limit) return false
    await incrementMessageUsageFallback(userId, 1)
    return true
  }

  return data === true
}

async function incrementMessageUsageFallback(userId: string, by = 1): Promise<void> {
  const month = currentMonthKey()
  const { data } = await supabaseAdmin
    .from('usage_monthly')
    .select('id, messages_count')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle()

  if (data) {
    await supabaseAdmin
      .from('usage_monthly')
      .update({ messages_count: data.messages_count + by })
      .eq('id', data.id)
  } else {
    await supabaseAdmin.from('usage_monthly').insert({
      user_id: userId,
      month,
      messages_count: by,
    })
  }
}

export async function assertCanCreateBot(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId)
  const { count } = await supabaseAdmin
    .from('bots')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', userId)

  if ((count ?? 0) >= plan.bots) {
    throw httpError(402, `Bot limit reached for ${plan.name} plan (${plan.bots}). Upgrade to create more.`)
  }
  return plan
}

export async function assertCanUploadDoc(
  userId: string,
  botId: string,
  fileBytes: number,
): Promise<PlanLimits> {
  const plan = await getUserPlan(userId)

  const { data: usage, error } = await supabaseAdmin.rpc('bot_document_usage', {
    p_bot_id: botId,
  })

  let count = 0
  let usedBytes = 0

  if (error) {
    console.warn('[usage] bot_document_usage RPC unavailable, using fallback:', error.message)
    const { data: docs } = await supabaseAdmin.from('documents').select('bytes').eq('bot_id', botId)
    count = docs?.length ?? 0
    usedBytes = (docs ?? []).reduce((sum, d) => sum + (d.bytes ?? 0), 0)
  } else {
    const row = Array.isArray(usage) ? usage[0] : usage
    count = Number(row?.doc_count ?? 0)
    usedBytes = Number(row?.total_bytes ?? 0)
  }

  if (count >= plan.docsPerBot) {
    throw httpError(402, `Document limit reached for ${plan.name} plan (${plan.docsPerBot} files).`)
  }
  if (usedBytes + fileBytes > plan.storageBytesPerBot) {
    throw httpError(402, `Storage limit reached for ${plan.name} plan.`)
  }
  return plan
}

export async function assertCanSendMessage(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId)
  const used = await getMessageUsage(userId)
  if (used >= plan.messagesPerMonth) {
    throw httpError(402, `Monthly message limit reached for ${plan.name} plan (${plan.messagesPerMonth}).`)
  }
  return plan
}

/** Reserve quota up-front (atomic). Call instead of assert + later increment. */
export async function consumeMessageOrThrow(userId: string): Promise<PlanLimits> {
  const plan = await getUserPlan(userId)
  const ok = await tryConsumeMessage(userId, plan.messagesPerMonth)
  if (!ok) {
    throw httpError(
      402,
      `Monthly message limit reached for ${plan.name} plan (${plan.messagesPerMonth}).`,
    )
  }
  return plan
}
