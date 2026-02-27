import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateBot } from '@/lib/telegram/bot-factory'
import { decryptToken } from '@/lib/crypto'
import type { Business } from '@/types/database'

export const runtime = 'nodejs'
// Disable body parsing — grammy reads it directly
export const dynamic = 'force-dynamic'

// In-memory deduplication: key = `${businessId}:${updateId}`, value = timestamp processed
const processedUpdates = new Map<string, number>()
const DEDUP_TTL_MS = 5 * 60 * 1000 // 5 minutes

function isDuplicateUpdate(businessId: string, updateId: number): boolean {
  const key = `${businessId}:${updateId}`
  const now = Date.now()
  // Evict old entries
  for (const [k, ts] of processedUpdates) {
    if (now - ts > DEDUP_TTL_MS) processedUpdates.delete(k)
  }
  if (processedUpdates.has(key)) return true
  processedUpdates.set(key, now)
  return false
}

export async function POST(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get('id')
  const hasSecret = !!req.headers.get('x-telegram-bot-api-secret-token')
  console.log(`[webhook] POST id=${businessId} hasSecret=${hasSecret}`)

  // Verify secret token
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.log(`[webhook] secret mismatch for id=${businessId}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!businessId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
    // Read body once for idempotency check, then reconstruct request for grammy
    const bodyText = await req.text()
    let updateId: number | undefined
    try {
      const update = JSON.parse(bodyText)
      updateId = update?.update_id
    } catch {
      // If body is not valid JSON, let grammy handle the error
    }

    // Idempotency check: skip duplicate updates (Telegram retries on timeout)
    if (updateId !== undefined && isDuplicateUpdate(businessId, updateId)) {
      console.log(`[webhook] duplicate update_id=${updateId} for businessId=${businessId}, skipping`)
      return NextResponse.json({ ok: true })
    }

    const supabase = await createServiceClient()

    const { data: business } = await supabase
      .from('businesses')
      .select('id, telegram_bot_token')
      .eq('id', businessId)
      .single<Pick<Business, 'id' | 'telegram_bot_token'>>()

    if (!business?.telegram_bot_token) {
      // Return 200 to prevent Telegram from retrying
      return NextResponse.json({ ok: true })
    }

    const plainToken = decryptToken(business.telegram_bot_token)
    const bot = await getOrCreateBot(plainToken, business.id)
    const handler = webhookCallback(bot, 'std/http')
    // Reconstruct request with the already-read body so grammy can parse it
    const newReq = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: bodyText,
    })
    return handler(newReq)
  } catch (err) {
    const errInfo = err instanceof Error ? { message: err.message, stack: err.stack } : err
    console.error(`[webhook] Error processing update for businessId=${businessId}:`, errInfo)
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true })
  }
}
