import Stripe from 'stripe'
import { config } from '../config.js'

export const stripe =
  config.STRIPE_SECRET_KEY.length > 0
    ? new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia',
      })
    : null

export function requireStripe(): Stripe {
  if (!stripe) {
    throw Object.assign(new Error('Stripe is not configured'), { statusCode: 503 })
  }
  return stripe
}
