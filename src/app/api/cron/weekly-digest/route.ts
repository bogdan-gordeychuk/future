import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type BizSettings = {
  notification_telegram_id?: string | null
  notification_chat_id?: string | null
  timezone?: string | null
}

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get('x-cron-secret') ??
    req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
  const weekAhead = new Date(now.getTime() + 7 * 24 * 3600 * 1000).toISOString()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, telegram_bot_token, settings')
    .in('subscription_status', ['trial', 'active'])
    .not('telegram_bot_token', 'is', null)

  if (!businesses?.length) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  let sent = 0
  let skipped = 0

  for (const biz of businesses) {
    const settings = biz.settings as BizSettings | null
    const notifChatId = settings?.notification_chat_id ?? settings?.notification_telegram_id
    if (!notifChatId || !biz.telegram_bot_token) { skipped++; continue }

    let plainToken: string
    try {
      plainToken = decryptToken(biz.telegram_bot_token)
    } catch { skipped++; continue }

    const [
      { data: weekBookings },
      { data: newClients },
      { count: messagesCount },
      { count: upcomingCount },
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('services(price_kopecks)')
        .eq('business_id', biz.id)
        .in('status', ['confirmed', 'completed'])
        .gte('scheduled_at', weekAgo)
        .lte('scheduled_at', now.toISOString()),
      supabase
        .from('clients')
        .select('id')
        .eq('business_id', biz.id)
        .gte('created_at', weekAgo),
      supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', biz.id)
        .eq('role', 'user')
        .gte('created_at', weekAgo),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', biz.id)
        .in('status', ['confirmed', 'pending'])
        .gte('scheduled_at', now.toISOString())
        .lte('scheduled_at', weekAhead),
    ])

    const bookingsCount = weekBookings?.length ?? 0
    const revenueKopecks = (weekBookings ?? []).reduce((sum, b) => {
      const svc = Array.isArray(b.services) ? b.services[0] : b.services
      return sum + ((svc as { price_kopecks?: number } | null)?.price_kopecks ?? 0)
    }, 0)
    const revenueRubles = Math.round(revenueKopecks / 100)

    const dateRange = `${new Date(weekAgo).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} – ${new Date(now).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`

    const text =
      `📊 Итоги недели — ${biz.name}\n` +
      `${dateRange}\n\n` +
      `📅 Записей: ${bookingsCount}\n` +
      `💰 Выручка: ${revenueRubles.toLocaleString('ru-RU')} ₽\n` +
      `👥 Новых клиентов: ${newClients?.length ?? 0}\n` +
      `💬 Сообщений в бот: ${messagesCount ?? 0}\n` +
      `🔜 Записей на след. неделе: ${upcomingCount ?? 0}`

    try {
      const res = await fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: notifChatId, text }),
      })
      if (res.ok) sent++
      else skipped++
    } catch { skipped++ }
  }

  return NextResponse.json({ ok: true, sent, skipped })
}
