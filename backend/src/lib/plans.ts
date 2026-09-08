export type PlanId = 'free' | 'pro' | 'business'

export type PlanLimits = {
  id: PlanId
  name: string
  priceMonthly: number
  bots: number
  docsPerBot: number
  storageBytesPerBot: number
  messagesPerMonth: number
  watermark: boolean
  branding: boolean
}

export const PLANS: Record<PlanId, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    bots: 1,
    docsPerBot: 3,
    storageBytesPerBot: 5 * 1024 * 1024,
    messagesPerMonth: 100,
    watermark: true,
    branding: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29,
    bots: 5,
    docsPerBot: 50,
    storageBytesPerBot: 50 * 1024 * 1024,
    messagesPerMonth: 2000,
    watermark: false,
    branding: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthly: 79,
    bots: 20,
    docsPerBot: 200,
    storageBytesPerBot: 200 * 1024 * 1024,
    messagesPerMonth: 10000,
    watermark: false,
    branding: true,
  },
}

export function planFromStripePrice(priceId: string, pricePro: string, priceBusiness: string): PlanId {
  if (priceId && priceId === pricePro) return 'pro'
  if (priceId && priceId === priceBusiness) return 'business'
  return 'free'
}
