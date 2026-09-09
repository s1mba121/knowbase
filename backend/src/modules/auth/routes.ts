import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../plugins/auth.js'
import { getMessageUsage, getUserPlan } from '../../lib/usage.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { PLANS } from '../../lib/plans.js'

export async function authRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: authGuard }, async (request) => {
    const userId = request.user.id
    const [{ data: profile }, plan, messagesUsed, { data: sub }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, email, name').eq('id', userId).maybeSingle(),
      getUserPlan(userId),
      getMessageUsage(userId),
      supabaseAdmin
        .from('subscriptions')
        .select('plan, status, stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle(),
    ])

    return {
      user: {
        id: userId,
        email: request.user.email,
        name: profile?.name ?? null,
      },
      subscription: {
        plan: plan.id,
        status: sub?.status ?? 'active',
        limits: plan,
      },
      usage: {
        messagesUsed,
        messagesLimit: plan.messagesPerMonth,
      },
      plans: Object.values(PLANS),
    }
  })
}
