export type PlanId = 'free' | 'pro' | 'business'

export type PlanLimits = {
  id: PlanId
  name: string
  priceMonthly: number
  bots: number
  docsPerBot: number
  storageBytesPerBot: number
  messagesPerMonth: number
  watermark: boolean
  branding: boolean
}

export type Bot = {
  id: string
  owner_id: string
  name: string
  system_prompt: string
  welcome_message: string
  primary_color: string
  public_key: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export type DocumentRow = {
  id: string
  bot_id: string
  filename: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  bytes: number
  error_message?: string | null
  created_at: string
}

export type ChatSource = {
  index: number
  chunk_id: string
  document_id: string
  filename: string | null
  excerpt: string
  similarity: number
}

export type MeResponse = {
  user: { id: string; email: string; name: string | null }
  subscription: { plan: PlanId; status: string; limits: PlanLimits }
  usage: { messagesUsed: number; messagesLimit: number }
  plans: PlanLimits[]
}
