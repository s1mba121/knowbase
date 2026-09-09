import 'dotenv/config'
import { z } from 'zod'

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3001),
    FRONTEND_URL: z.string().default('http://localhost:5173'),
    BACKEND_URL: z.string().default('http://localhost:3001'),
    SUPABASE_URL: z.string().min(1),
    // Current Supabase dashboard names
    SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
    SUPABASE_SECRET_KEY: z.string().optional(),
    // Legacy aliases (anon / service_role)
    SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().optional().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().optional().default(''),
    STRIPE_PRICE_PRO: z.string().optional().default(''),
    STRIPE_PRICE_BUSINESS: z.string().optional().default(''),
    REDIS_URL: z.string().optional().default(''),
    INGEST_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
    INGEST_MAX_QUEUED: z.coerce.number().int().min(1).max(500).default(20),
    OPENAI_MAX_INFLIGHT: z.coerce.number().int().min(1).max(64).default(8),
    /** Run DB ingest poller inside the API process (disable if using a dedicated worker). */
    INGEST_EMBEDDED_WORKER: z
      .string()
      .optional()
      .default('true')
      .transform((v) => !['0', 'false', 'no'].includes(v.toLowerCase())),
  })
  .superRefine((val, ctx) => {
    if (!val.SUPABASE_PUBLISHABLE_KEY && !val.SUPABASE_ANON_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_PUBLISHABLE_KEY'],
        message: 'Set SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY)',
      })
    }
    if (!val.SUPABASE_SECRET_KEY && !val.SUPABASE_SERVICE_ROLE_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SECRET_KEY'],
        message: 'Set SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)',
      })
    }
    if (val.STRIPE_SECRET_KEY && !val.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set',
      })
    }
  })
  .transform((val) => ({
    PORT: val.PORT,
    FRONTEND_URL: val.FRONTEND_URL,
    BACKEND_URL: val.BACKEND_URL,
    SUPABASE_URL: val.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: val.SUPABASE_PUBLISHABLE_KEY || val.SUPABASE_ANON_KEY || '',
    SUPABASE_SECRET_KEY: val.SUPABASE_SECRET_KEY || val.SUPABASE_SERVICE_ROLE_KEY || '',
    OPENAI_API_KEY: val.OPENAI_API_KEY,
    STRIPE_SECRET_KEY: val.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: val.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_PRO: val.STRIPE_PRICE_PRO,
    STRIPE_PRICE_BUSINESS: val.STRIPE_PRICE_BUSINESS,
    REDIS_URL: val.REDIS_URL,
    INGEST_CONCURRENCY: val.INGEST_CONCURRENCY,
    INGEST_MAX_QUEUED: val.INGEST_MAX_QUEUED,
    OPENAI_MAX_INFLIGHT: val.OPENAI_MAX_INFLIGHT,
    INGEST_EMBEDDED_WORKER: val.INGEST_EMBEDDED_WORKER,
  }))

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  console.error('Copy .env.example to .env and fill in values.')
  process.exit(1)
}

export const config = parsed.data
