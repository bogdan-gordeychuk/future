import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateBot } from '@/lib/telegram/bot-factory'
import { decryptToken } from '@/lib/crypto'
import type { Business } from '@/types/database'

export const runtime = 'nodejs'
// Disable body parsing — grammy reads it directly
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Verify secret token
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Extract business ID from URL: /api/telegram/webhook?id=BUSINESS_UUID
  const businessId = req.nextUrl.searchParams.get('id')
  if (!businessId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  try {
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
    return handler(req)
  } catch (err) {
    const errInfo = err instanceof Error ? { message: err.message, stack: err.stack } : err
    console.error(`[webhook] Error processing update for businessId=${businessId}:`, errInfo)
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true })
  }
}
