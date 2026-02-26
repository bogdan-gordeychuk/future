import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Business } from '@/types/database'

const TELEGRAM_API = 'https://api.telegram.org/bot'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessId } = await req.json()
  if (!businessId) {
    return NextResponse.json({ error: 'businessId required' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Get business and verify ownership
  const { data: business } = await serviceClient
    .from('businesses')
    .select('id, owner_id, telegram_bot_token')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single<Pick<Business, 'id' | 'owner_id' | 'telegram_bot_token'>>()

  if (!business || !business.telegram_bot_token) {
    return NextResponse.json({ error: 'Business not found or no bot token' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const webhookUrl = `${appUrl}/api/telegram/webhook?token=${business.telegram_bot_token}`

  const telegramRes = await fetch(
    `${TELEGRAM_API}${business.telegram_bot_token}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      }),
    }
  )

  const telegramData = await telegramRes.json()

  if (!telegramData.ok) {
    return NextResponse.json(
      { error: 'Telegram error', details: telegramData.description },
      { status: 400 }
    )
  }

  // Save registration timestamp
  await serviceClient
    .from('businesses')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', businessId)

  return NextResponse.json({ ok: true, webhookUrl })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessId } = await req.json()
  const serviceClient = await createServiceClient()

  const { data: business } = await serviceClient
    .from('businesses')
    .select('id, owner_id, telegram_bot_token')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single<Pick<Business, 'id' | 'owner_id' | 'telegram_bot_token'>>()

  if (!business || !business.telegram_bot_token) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  await fetch(
    `${TELEGRAM_API}${business.telegram_bot_token}/deleteWebhook`,
    { method: 'POST' }
  )

  return NextResponse.json({ ok: true })
}
