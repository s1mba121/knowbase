import { supabaseAdmin } from './supabase.js'

/** Returns true if this is the first time we see the Stripe event id. */
export async function claimStripeEvent(eventId: string, eventType: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from('stripe_events').insert({
    id: eventId,
    type: eventType,
  })

  if (!error) return true
  if (error.code === '23505') return false

  // Table missing (migration 004 not applied) — process event to avoid dropping payments
  console.warn('[stripe] stripe_events insert failed, processing without idempotency:', error.message)
  return true
}
