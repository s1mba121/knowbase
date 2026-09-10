import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { PLANS, planFromStripePrice } from '../src/lib/plans.js'

describe('plans', () => {
  it('free plan has watermark and tight limits', () => {
    assert.equal(PLANS.free.watermark, true)
    assert.equal(PLANS.free.branding, false)
    assert.equal(PLANS.free.bots, 1)
    assert.equal(PLANS.free.messagesPerMonth, 100)
  })

  it('paid plans remove watermark and enable branding', () => {
    assert.equal(PLANS.pro.watermark, false)
    assert.equal(PLANS.pro.branding, true)
    assert.equal(PLANS.business.watermark, false)
    assert.equal(PLANS.business.branding, true)
  })

  it('maps Stripe price ids to plan ids', () => {
    assert.equal(planFromStripePrice('price_pro', 'price_pro', 'price_biz'), 'pro')
    assert.equal(planFromStripePrice('price_biz', 'price_pro', 'price_biz'), 'business')
    assert.equal(planFromStripePrice('unknown', 'price_pro', 'price_biz'), 'free')
    assert.equal(planFromStripePrice('', 'price_pro', 'price_biz'), 'free')
  })
})
