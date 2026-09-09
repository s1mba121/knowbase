import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { authGuard } from '../../plugins/auth.js'
import { config } from '../../config.js'
import { requireStripe, stripe } from '../../lib/stripe.js'
import { supabaseAdmin } from '../../lib/supabase.js'
import { httpError } from '../../plugins/error-handler.js'
import { planFromStripePrice, type PlanId, PLANS } from '../../lib/plans.js'
import { getMessageUsage, getUserPlan } from '../../lib/usage.js'

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'business']),
})

async function ensureCustomer(userId: string, email: string): Promise<string> {
  const s = requireStripe()
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (sub?.stripe_customer_id) return sub.stripe_customer_id

  const customer = await s.customers.create({
    email,
    metadata: { user_id: userId },
  })

  await supabaseAdmin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    plan: sub?.plan ?? 'free',
    status: sub?.status ?? 'active',
  })

  return customer.id
}

async function upsertSubscription(opts: {
  userId: string
  customerId?: string | null
  subscriptionId?: string | null
  plan: PlanId
  status: string
}) {
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', opts.userId)
    .maybeSingle()

  const payload = {
    user_id: opts.userId,
    stripe_customer_id: opts.customerId ?? null,
    stripe_subscription_id: opts.subscriptionId ?? null,
    plan: opts.plan,
    status: opts.status,
  }

  if (existing) {
    await supabaseAdmin.from('subscriptions').update(payload).eq('user_id', opts.userId)
  } else {
    await supabaseAdmin.from('subscriptions').insert(payload)
  }
}

export async function billingRoutes(app: FastifyInstance) {
  app.get('/plans', async () => Object.values(PLANS))

  app.get('/usage', { preHandler: authGuard }, async (request) => {
    const plan = await getUserPlan(request.user.id)
    const messagesUsed = await getMessageUsage(request.user.id)
    const { count: botCount } = await supabaseAdmin
      .from('bots')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', request.user.id)

    return {
      plan,
      messagesUsed,
      messagesLimit: plan.messagesPerMonth,
      botsUsed: botCount ?? 0,
      botsLimit: plan.bots,
    }
  })

  app.post('/checkout', { preHandler: authGuard }, async (request) => {
    const body = checkoutSchema.parse(request.body)
    const s = requireStripe()
    const priceId = body.plan === 'pro' ? config.STRIPE_PRICE_PRO : config.STRIPE_PRICE_BUSINESS
    if (!priceId) throw httpError(503, 'Stripe price IDs are not configured')

    const customerId = await ensureCustomer(request.user.id, request.user.email)
    const session = await s.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.FRONTEND_URL}/app/billing?success=1`,
      cancel_url: `${config.FRONTEND_URL}/app/billing?canceled=1`,
      metadata: { user_id: request.user.id, plan: body.plan },
      subscription_data: {
        metadata: { user_id: request.user.id, plan: body.plan },
      },
    })

    return { url: session.url }
  })

  app.post('/portal', { preHandler: authGuard }, async (request) => {
    const s = requireStripe()
    const customerId = await ensureCustomer(request.user.id, request.user.email)
    const session = await s.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.FRONTEND_URL}/app/billing`,
    })
    return { url: session.url }
  })

  app.post('/webhook', { config: { rawBody: true } }, async (request, reply) => {
    if (!stripe) {
      return reply.code(503).send({ error: 'Stripe not configured' })
    }

    const sig = request.headers['stripe-signature']
    if (!sig || typeof sig !== 'string') {
      return reply.code(400).send({ error: 'Missing stripe-signature' })
    }

    let event
    try {
      const raw = (request as { rawBody?: Buffer }).rawBody
      if (!raw) {
        return reply.code(400).send({ error: 'Missing raw request body for webhook verification' })
      }
      event = stripe.webhooks.constructEvent(raw, sig, config.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Webhook error'
      return reply.code(400).send({ error: message })
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.metadata?.user_id
        let plan: PlanId = 'free'
        if (typeof session.subscription === 'string' && stripe) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription)
            const priceId = sub.items.data[0]?.price?.id ?? ''
            plan = planFromStripePrice(priceId, config.STRIPE_PRICE_PRO, config.STRIPE_PRICE_BUSINESS)
          } catch {
            // fall through
          }
        }
        // Local demos without price IDs may still set metadata.plan
        if (
          plan === 'free' &&
          !config.STRIPE_PRICE_PRO &&
          !config.STRIPE_PRICE_BUSINESS &&
          (session.metadata?.plan === 'pro' || session.metadata?.plan === 'business')
        ) {
          plan = session.metadata.plan as PlanId
        }
        if (userId && plan !== 'free') {
          await upsertSubscription({
            userId,
            customerId: typeof session.customer === 'string' ? session.customer : null,
            subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
            plan,
            status: 'active',
          })
        } else if (userId && plan === 'free') {
          // Still mark active free if we couldn't map a paid price
          await upsertSubscription({
            userId,
            customerId: typeof session.customer === 'string' ? session.customer : null,
            subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
            plan: 'free',
            status: 'active',
          })
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const userId = sub.metadata?.user_id
        const priceId = sub.items.data[0]?.price?.id ?? ''
        const plan = planFromStripePrice(priceId, config.STRIPE_PRICE_PRO, config.STRIPE_PRICE_BUSINESS)
        const statusOk = sub.status === 'active' || sub.status === 'trialing'
        if (userId) {
          await upsertSubscription({
            userId,
            customerId: typeof sub.customer === 'string' ? sub.customer : null,
            subscriptionId: sub.id,
            plan: event.type === 'customer.subscription.deleted' || !statusOk ? 'free' : plan,
            status: event.type === 'customer.subscription.deleted' ? 'canceled' : sub.status,
          })
        }
        break
      }
      default:
        break
    }

    return { received: true }
  })
}
