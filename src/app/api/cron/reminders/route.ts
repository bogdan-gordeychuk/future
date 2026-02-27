import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret =
    req.headers.get('x-cron-secret') ??
    req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const now = new Date()

  // 24h window: bookings between 23.5h and 24.5h from now
  const h24Start = new Date(now.getTime() + 23.5 * 3600 * 1000).toISOString()
  const h24End = new Date(now.getTime() + 24.5 * 3600 * 1000).toISOString()

  // 1h window: bookings between 45min and 75min from now
  const h1Start = new Date(now.getTime() + 45 * 60 * 1000).toISOString()
  const h1End = new Date(now.getTime() + 75 * 60 * 1000).toISOString()

  const [{ data: bookings24h }, { data: bookings1h }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, scheduled_at, business_id, businesses(telegram_bot_token), clients(telegram_user_id, first_name), services(name)')
      .gte('scheduled_at', h24Start)
      .lte('scheduled_at', h24End)
      .is('reminder_24h_sent_at', null)
      .in('status', ['pending', 'confirmed']),
    supabase
      .from('bookings')
      .select('id, scheduled_at, business_id, businesses(telegram_bot_token), clients(telegram_user_id, first_name), services(name)')
      .gte('scheduled_at', h1Start)
      .lte('scheduled_at', h1End)
      .is('reminder_1h_sent_at', null)
      .in('status', ['pending', 'confirmed']),
  ])

  let sent24h = 0
  let sent1h = 0

  for (const booking of bookings24h ?? []) {
    const ok = await sendReminder(booking, '24h')
    if (ok) {
      await supabase
        .from('bookings')
        .update({ reminder_24h_sent_at: now.toISOString() })
        .eq('id', booking.id)
      sent24h++
    }
  }

  for (const booking of bookings1h ?? []) {
    const ok = await sendReminder(booking, '1h')
    if (ok) {
      await supabase
        .from('bookings')
        .update({ reminder_1h_sent_at: now.toISOString() })
        .eq('id', booking.id)
      sent1h++
    }
  }

  return NextResponse.json({ ok: true, sent24h, sent1h })
}

type BookingWithJoins = {
  id: string
  scheduled_at: string
  business_id: string
  businesses: { telegram_bot_token: string | null }[] | { telegram_bot_token: string | null } | null
  clients: { telegram_user_id: number | null; first_name: string | null }[] | { telegram_user_id: number | null; first_name: string | null } | null
  services: { name: string }[] | { name: string } | null
}

async function sendReminder(booking: BookingWithJoins, type: '24h' | '1h'): Promise<boolean> {
  const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
  const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients
  const service = Array.isArray(booking.services) ? booking.services[0] : booking.services

  const encryptedToken = biz?.telegram_bot_token
  const telegramUserId = client?.telegram_user_id

  if (!encryptedToken || !telegramUserId) return false

  let plainToken: string
  try {
    plainToken = decryptToken(encryptedToken)
  } catch {
    return false
  }

  const time = new Date(booking.scheduled_at).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  })

  const name = client?.first_name ? `, ${client.first_name}` : ''
  const serviceName = service?.name ?? 'услуга'

  const text =
    type === '24h'
      ? `⏰ Напоминание${name}: завтра в ${time} у вас запись на «${serviceName}». Ждём вас!`
      : `⏰ Напоминание${name}: через час в ${time} у вас запись на «${serviceName}». До встречи!`

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${plainToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramUserId, text }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}
