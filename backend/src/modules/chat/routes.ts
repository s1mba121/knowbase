import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../plugins/auth.js'
import { chatSchema } from './schema.js'
import * as chat from './service.js'

export async function chatRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.post('/:botId/chat', async (request) => {
    const { botId } = request.params as { botId: string }
    const body = chatSchema.parse(request.body)
    return chat.chatInApp(request.user.id, botId, body.message, body.conversation_id)
  })

  app.post('/:botId/chat/stream', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const body = chatSchema.parse(request.body)

    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': request.headers.origin ?? '*',
      'Access-Control-Allow-Credentials': 'true',
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
  })

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
    return chat.getConversationMessages(request.user.id, botId, conversationId)
  })

  app.delete('/:botId/conversations/:conversationId', async (request) => {
    const { botId, conversationId } = request.params as {
      botId: string
      conversationId: string
    }
    return chat.deleteConversation(request.user.id, botId, conversationId)
  })
}
