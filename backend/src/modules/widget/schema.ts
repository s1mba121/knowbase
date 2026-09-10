import { z } from 'zod'

export const widgetChatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversation_id: z.string().uuid().optional().nullable(),
  visitor_id: z.string().min(1).max(100).optional().nullable(),
})

export type WidgetChatBody = z.infer<typeof widgetChatSchema>
