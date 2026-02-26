import { NextRequest, NextResponse } from 'next/server'
import { webhookCallback } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrCreateBot } from '@/lib/telegram/bot-factory'
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

  // Extract bot token from URL: /api/telegram/webhook?token=xxx
  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  try {
    const supabase = await createServiceClient()

    // Find business by bot token
    const { data: business } = await supabase
      .from('businesses')
      .select('id, telegram_bot_token')
      .eq('telegram_bot_token', token)
      .single<Pick<Business, 'id' | 'telegram_bot_token'>>()

    if (!business) {
      // Return 200 to prevent Telegram from retrying
      return NextResponse.json({ ok: true })
    }

    const bot = await getOrCreateBot(token)
    const handler = webhookCallback(bot, 'std/http')
    return handler(req)
  } catch (err) {
    console.error('[webhook] Error processing update:', err)
    // Always return 200 to Telegram
    return NextResponse.json({ ok: true })
  }
}
