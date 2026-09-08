import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../plugins/auth.js'
import { createBotSchema, updateBotSchema } from './schema.js'
import * as bots from './service.js'
import { config } from '../../config.js'
import { getUserPlan } from '../../lib/usage.js'

export async function botsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.get('/', async (request) => {
    return bots.listBots(request.user.id)
  })

  app.post('/', async (request) => {
    const body = createBotSchema.parse(request.body)
    return bots.createBot(request.user.id, body)
  })

  app.get('/:botId', async (request) => {
    const { botId } = request.params as { botId: string }
    return bots.getBot(request.user.id, botId)
  })

  app.patch('/:botId', async (request) => {
    const { botId } = request.params as { botId: string }
    const body = updateBotSchema.parse(request.body)
    return bots.updateBot(request.user.id, botId, body)
  })

  app.delete('/:botId', async (request) => {
    const { botId } = request.params as { botId: string }
    return bots.deleteBot(request.user.id, botId)
  })

  app.get('/:botId/embed', async (request) => {
    const { botId } = request.params as { botId: string }
    const bot = await bots.getBot(request.user.id, botId)
    const plan = await getUserPlan(request.user.id)
    const scriptUrl = `${config.BACKEND_URL}/widget.js`
    const snippet = `<script src="${scriptUrl}" data-bot-key="${bot.public_key}" data-api="${config.BACKEND_URL}" async></script>`
    return {
      public_key: bot.public_key,
      snippet,
      scriptUrl,
      watermark: plan.watermark,
      branding: plan.branding,
      is_published: bot.is_published,
    }
  })
}
