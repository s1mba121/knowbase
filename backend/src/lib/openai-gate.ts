import { config } from '../config.js'
import { Semaphore } from './semaphore.js'

/** Cap concurrent OpenAI calls so embed/chat spikes don't melt the process or hit 429s. */
const openaiGate = new Semaphore(config.OPENAI_MAX_INFLIGHT)

export function withOpenAI<T>(fn: () => Promise<T>): Promise<T> {
  return openaiGate.run(fn)
}

export function acquireOpenAI(): Promise<() => void> {
  return openaiGate.acquire()
}

export function getOpenAIGateStats() {
  return openaiGate.stats
}
