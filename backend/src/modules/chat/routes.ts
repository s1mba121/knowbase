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

  app.get('/:botId/conversations', async (request) => {
    const { botId } = request.params as { botId: string }
    return chat.listConversations(request.user.id, botId)
  })

  app.get('/:botId/conversations/:conversationId', async (request) => {
    const { botId, conversationId } = request.params as {
      botId: string
      conversationId: string
    }
    return chat.getConversationMessages(request.user.id, botId, conversationId)
  })
}
