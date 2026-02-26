// In-memory rate limiter: 10 messages/min per telegram_user_id
const userTimestamps = new Map<number, number[]>()

const RATE_LIMIT = 10
const WINDOW_MS = 60_000

export function checkRateLimit(telegramUserId: number): boolean {
  const now = Date.now()
  const timestamps = (userTimestamps.get(telegramUserId) ?? []).filter(
    (t) => now - t < WINDOW_MS
  )

  if (timestamps.length >= RATE_LIMIT) {
    userTimestamps.set(telegramUserId, timestamps)
    return false
  }

  timestamps.push(now)
  userTimestamps.set(telegramUserId, timestamps)
  return true
}
