import type { FastifyInstance, FastifyRequest } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { z } from 'zod'
import { getBotByPublicKey } from '../bots/service.js'
import { runRagChat } from '../chat/service.js'
import { getUserPlan } from '../../lib/usage.js'
import { clientIp } from '../../plugins/error-handler.js'

const widgetChatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional().nullable(),
  visitor_id: z.string().min(1).max(100).optional().nullable(),
})

export async function widgetRoutes(app: FastifyInstance) {
  await app.register(rateLimit, {
    global: false,
    keyGenerator: (request: FastifyRequest) => {
      const params = request.params as { publicKey?: string }
      return `${clientIp(request)}:${params.publicKey || 'unknown'}`
    },
    errorResponseBuilder: (
      _request: FastifyRequest,
      context: { ttl: number },
    ) => ({
      statusCode: 429,
      error: `Too many requests. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
    }),
  })

  app.get(
    '/:publicKey/config',
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => {
      const { publicKey } = request.params as { publicKey: string }
      const bot = await getBotByPublicKey(publicKey)
      const plan = await getUserPlan(bot.owner_id)

      return {
        name: bot.name,
        welcome_message: bot.welcome_message,
        primary_color: plan.branding ? bot.primary_color : '#0F766E',
        watermark: plan.watermark,
        suggestions: [
          'How do I get started?',
          'What are the main features?',
          'Where can I find pricing info?',
        ],
      }
    },
  )

  app.post(
    '/:publicKey/chat',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (request) => {
      const { publicKey } = request.params as { publicKey: string }
      const body = widgetChatSchema.parse(request.body)
      const bot = await getBotByPublicKey(publicKey)

      return runRagChat({
        bot,
        message: body.message,
        conversationId: body.conversation_id,
        channel: 'widget',
        visitorId: body.visitor_id ?? null,
      })
    },
  )
}
