import { z } from 'zod'

export const createBotSchema = z.object({
  name: z.string().min(1).max(80),
  system_prompt: z
    .string()
    .max(4000)
    .optional()
    .default(
      'You are a helpful support assistant. Answer only using the provided documentation context. If the answer is not in the context, say you do not know and suggest contacting support.',
    ),
  welcome_message: z.string().max(500).optional().default('Hi! Ask me anything about our product.'),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default('#0F766E'),
})

export const updateBotSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  system_prompt: z.string().max(4000).optional(),
  welcome_message: z.string().max(500).optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  is_published: z.boolean().optional(),
})
