import { supabaseAdmin } from './supabase.js'
import { PLANS, type PlanId, type PlanLimits } from './plans.js'
import { httpError } from '../plugins/error-handler.js'

export async function getUserPlan(userId: string): Promise<PlanLimits> {
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return PLANS.free

  const active = data.status === 'active' || data.status === 'trialing'
  const planId = (active ? (data.plan as PlanId) : 'free') || 'free'
  return PLANS[planId] ?? PLANS.free
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

export async function incrementMessageUsage(userId: string, by = 1): Promise<void> {
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
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('bytes')
    .eq('bot_id', botId)

  const count = docs?.length ?? 0
  const usedBytes = (docs ?? []).reduce((sum, d) => sum + (d.bytes ?? 0), 0)

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
