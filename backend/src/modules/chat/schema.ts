import { z } from 'zod'

export const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional().nullable(),
})
