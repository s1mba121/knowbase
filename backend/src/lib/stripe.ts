import https from 'node:https'
import dns from 'node:dns'
import Stripe from 'stripe'
import { config } from '../config.js'

// Docker/VPS IPv6 routes to Stripe often blackhole; force IPv4 for the SDK.
dns.setDefaultResultOrder('ipv4first')
const ipv4Agent = new https.Agent({ family: 4, keepAlive: true })

export const stripe =
  config.STRIPE_SECRET_KEY.length > 0
    ? new Stripe(config.STRIPE_SECRET_KEY, {
        apiVersion: '2025-02-24.acacia',
        timeout: 20_000,
        maxNetworkRetries: 2,
        httpAgent: ipv4Agent,
      })
    : null

export function requireStripe(): Stripe {
  if (!stripe) {
    throw Object.assign(new Error('Stripe is not configured'), { statusCode: 503 })
  }
  return stripe
}
