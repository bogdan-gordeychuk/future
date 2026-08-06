import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

const inMemory = new Map<number, number[]>()
const LIMIT = 10
const WINDOW_MS = 60_000

function checkInMemoryRateLimit(telegramUserId: number): boolean {
  const now = Date.now()
  const ts = (inMemory.get(telegramUserId) ?? []).filter(t => now - t < WINDOW_MS)
  ts.push(now)
  inMemory.set(telegramUserId, ts)
  return ts.length <= LIMIT
}

export async function checkRateLimit(telegramUserId: number): Promise<boolean> {
  if (redis) {
    try {
      const key = `vika:rl:${telegramUserId}`
      const now = Date.now()
      const p = redis.pipeline()
      p.zremrangebyscore(key, 0, now - WINDOW_MS)
      p.zadd(key, { score: now, member: `${now}` })
      p.zcard(key)
      p.expire(key, 70)
      const results = await p.exec()
      return (results[2] as number) <= LIMIT
    } catch (error) {
      console.error('[rate-limit] Redis unavailable, using in-memory fallback', error)
    }
  }

  return checkInMemoryRateLimit(telegramUserId)
}
