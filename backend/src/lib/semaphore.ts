/** Bounded concurrency helper for protecting shared upstreams (OpenAI, CPU). */
export class Semaphore {
  private active = 0
  private readonly waiters: Array<() => void> = []

  constructor(private readonly max: number) {
    if (max < 1) throw new Error('Semaphore max must be >= 1')
  }

  get stats() {
    return { active: this.active, waiting: this.waiters.length, max: this.max }
  }

  async acquire(): Promise<() => void> {
    await this.waitTurn()
    let released = false
    return () => {
      if (released) return
      released = true
      this.release()
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire()
    try {
      return await fn()
    } finally {
      release()
    }
  }

  private waitTurn(): Promise<void> {
    if (this.active < this.max) {
      this.active += 1
      return Promise.resolve()
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1
        resolve()
      })
    })
  }

  private release(): void {
    this.active -= 1
    const next = this.waiters.shift()
    if (next) next()
  }
}
