import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get('x-cron-secret') ??
    req.nextUrl.searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const platformToken = process.env.PLATFORM_BOT_TOKEN
  const platformChatId = process.env.PLATFORM_CHAT_ID
  if (!platformToken || !platformChatId) {
    return NextResponse.json({ error: 'PLATFORM_BOT_TOKEN or PLATFORM_CHAT_ID not configured' }, { status: 500 })
  }

  const supabase = await createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const in3days = new Date(now.getTime() + 3 * 24 * 3600 * 1000).toISOString()

  const [
    { data: businesses },
    { data: tokenStats },
    { count: bookingsToday },
  ] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, subscription_status, trial_ends_at')
      .in('subscription_status', ['trial', 'active']),
    supabase
      .from('messages')
      .select('tokens_used')
      .eq('role', 'assistant')
      .gte('created_at', monthStart),
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', todayStart)
      .lt('scheduled_at', todayEnd)
      .in('status', ['confirmed', 'pending']),
  ])

  const totalBiz = businesses?.length ?? 0
  const trialBiz = businesses?.filter(b => b.subscription_status === 'trial').length ?? 0
  const activeBiz = businesses?.filter(b => b.subscription_status === 'active').length ?? 0
  const expiringTrials = businesses?.filter(b =>
    b.subscription_status === 'trial' &&
    b.trial_ends_at !== null &&
    new Date(b.trial_ends_at) <= new Date(in3days)
  ).length ?? 0

  const totalTokens = (tokenStats ?? []).reduce((sum, m) => sum + (m.tokens_used ?? 0), 0)
  const estimatedCostUsd = (totalTokens / 1_000_000) * 1.28

  const dateStr = now.toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', timeZone: 'Europe/Moscow',
  })

  let text =
    `📊 VIKA Daily — ${dateStr}\n\n` +
    `🏢 Активных бизнесов: ${totalBiz} (трайал: ${trialBiz}, платных: ${activeBiz})\n` +
    `⏳ Трайалов истекает в 3 дня: ${expiringTrials}\n` +
    `📅 Записей сегодня: ${bookingsToday ?? 0}\n` +
    `🤖 Токенов за месяц: ${totalTokens.toLocaleString('ru-RU')} (~$${estimatedCostUsd.toFixed(2)})`

  if (estimatedCostUsd > 25) {
    text += '\n\n🔴 КРИТИЧНО: подними лимит в Anthropic Console!'
  } else if (estimatedCostUsd > 20) {
    text += '\n\n⚠️ Приближаемся к лимиту $30 в Anthropic'
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${platformToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: platformChatId, text }),
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('[monitor] Telegram send error:', data.description)
      return NextResponse.json({ ok: false, error: data.description }, { status: 500 })
    }
  } catch (err) {
    console.error('[monitor] fetch error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    totalBiz,
    trialBiz,
    activeBiz,
    expiringTrials,
    bookingsToday: bookingsToday ?? 0,
    totalTokens,
    estimatedCostUsd: +estimatedCostUsd.toFixed(2),
  })
}
