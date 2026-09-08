import OpenAI from 'openai'
import { config } from '../config.js'

export const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY })

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const CHAT_MODEL = 'gpt-4o-mini'
export const EMBEDDING_DIMS = 1536

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text])
  return embedding
}
