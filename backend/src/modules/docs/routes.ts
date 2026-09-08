import type { FastifyInstance } from 'fastify'
import { authGuard } from '../../plugins/auth.js'
import * as docs from './service.js'

export async function docsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard)

  app.get('/:botId/documents', async (request) => {
    const { botId } = request.params as { botId: string }
    return docs.listDocuments(request.user.id, botId)
  })

  app.post('/:botId/documents', async (request, reply) => {
    const { botId } = request.params as { botId: string }
    const file = await request.file()
    if (!file) {
      return reply.code(400).send({ error: 'file is required' })
    }

    const buffer = await file.toBuffer()
    if (buffer.byteLength === 0) {
      return reply.code(400).send({ error: 'Empty file' })
    }
    if (buffer.byteLength > 20 * 1024 * 1024) {
      return reply.code(400).send({ error: 'File too large (max 20MB)' })
    }

    return docs.uploadAndIngest(
      request.user.id,
      botId,
      file.filename,
      buffer,
      file.mimetype,
    )
  })

  app.delete('/:botId/documents/:documentId', async (request) => {
    const { botId, documentId } = request.params as { botId: string; documentId: string }
    return docs.deleteDocument(request.user.id, botId, documentId)
  })
}
