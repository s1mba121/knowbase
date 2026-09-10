import type { FastifyInstance, FastifyRequest } from 'fastify'
import rateLimit from '@fastify/rate-limit'
import { authGuard } from '../../plugins/auth.js'
import { clientIp } from '../../plugins/error-handler.js'
import { buildRateLimitOptions } from '../../lib/rate-limit.js'
import { appPublicOrigin, isTrustedAppOrigin } from '../../lib/public-url.js'
import { chatSchema } from './schema.js'
import * as chat from './service.js'

export async function chatRoutes(app: FastifyInstance) {
  await app.register(
    rateLimit,
    await buildRateLimitOptions({
      keyGenerator: (request: FastifyRequest) => {
        const auth = request.headers.authorization
        if (typeof auth === 'string' && auth.length > 16) {
          return `tok:${auth.slice(-32)}`
        }
        return `ip:${clientIp(request)}`
      },
      errorResponseBuilder: (_request: FastifyRequest, context: { ttl: number }) => ({
        statusCode: 429,
        error: `Too many chat requests. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
      }),
    }),
  )

  app.addHook('preHandler', authGuard)

  app.post(
    '/:botId/chat',
    {
      config: {
        rateLimit: { max: 40, timeWindow: '1 minute' },
      },
    },
    async (request) => {
      const { botId } = request.params as { botId: string }
      const body = chatSchema.parse(request.body)
      return chat.chatInApp(request.user.id, botId, body.message, body.conversation_id)
    },
  )

  app.post(
    '/:botId/chat/stream',
    {
      config: {
        rateLimit: { max: 40, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      const { botId } = request.params as { botId: string }
      const body = chatSchema.parse(request.body)
      const origin = request.headers.origin
      const allowOrigin =
        typeof origin === 'string' && isTrustedAppOrigin(origin, request)
          ? origin
          : appPublicOrigin(request)

      reply.hijack()
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Credentials': 'true',
        Vary: 'Origin',
      })

      try {
        for await (const event of chat.streamChatInApp(
          request.user.id,
          botId,
          body.message,
          body.conversation_id,
        )) {
          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed'
        const status = (err as { statusCode?: number }).statusCode
        reply.raw.write(`data: ${JSON.stringify({ type: 'error', error: message, status })}\n\n`)
      } finally {
        reply.raw.end()
      }
    },
  )

  app.get('/:botId/conversations', async (request) => {
    const { botId } = request.params as { botId: string }
    const query = request.query as { channel?: string }
    const channel = query.channel === 'widget' ? 'widget' : 'app'
    return chat.listConversations(request.user.id, botId, channel)
  })

  app.get('/:botId/conversations/:conversationId', async (request) => {
    const { botId, conversationId } = request.params as {
      botId: string
      conversationId: string
    }
    const query = request.query as { limit?: string; cursor?: string }
    return chat.getConversationMessages(request.user.id, botId, conversationId, {
      limit: query.limit ? Number(query.limit) : undefined,
      cursor: query.cursor || null,
    })
  })

  app.delete('/:botId/conversations/:conversationId', async (request) => {
    const { botId, conversationId } = request.params as {
      botId: string
      conversationId: string
    }
    return chat.deleteConversation(request.user.id, botId, conversationId)
  })
}
