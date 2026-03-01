import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'

const CHECK = (
  <svg className="w-3 h-3 text-green-600" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)

  if (!business) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-sm text-center">
        <p className="text-zinc-500">Бизнес не найден. Пожалуйста, зарегистрируйтесь заново.</p>
      </div>
    )
  }

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = new Date().toISOString().slice(0, 8) + '01'

  const [
    { count: bookingsToday },
    { count: totalClients },
    { count: messagesMonth },
    { count: servicesCount },
    { data: upcomingBookings },
    { data: monthBookings },
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('scheduled_at', today)
      .in('status', ['confirmed', 'completed']),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
    supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('role', 'user')
      .gte('created_at', monthStart),
    supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('is_active', true),
    supabase
      .from('bookings')
      .select('id, scheduled_at, status, services(name), masters(name), clients(first_name, preferred_name, telegram_username)')
      .eq('business_id', business.id)
      .in('status', ['confirmed', 'pending'])
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5),
    supabase
      .from('bookings')
      .select('services(price_kopecks)')
      .eq('business_id', business.id)
      .in('status', ['confirmed', 'completed'])
      .gte('scheduled_at', monthStart),
  ])

  const revenueKopecks = (monthBookings ?? []).reduce((sum, b) => {
    const svc = Array.isArray(b.services) ? b.services[0] : b.services
    return sum + ((svc as { price_kopecks?: number } | null)?.price_kopecks ?? 0)
  }, 0)
  const revenueRubles = Math.round(revenueKopecks / 100)
  const monthBookingsCount = (monthBookings ?? []).length

  const bizSettings = business.settings as { notification_telegram_id?: string | null } | null
  const setupSteps = [
    { label: 'Бизнес создан', done: true },
    { label: 'Добавьте хотя бы одну услугу', done: (servicesCount ?? 0) > 0, href: '/services' },
    { label: 'Сохраните токен Telegram-бота', done: !!business.telegram_bot_token, href: '/settings' },
    { label: 'Подключите webhook', done: !!business.telegram_bot_username, href: '/settings' },
    { label: 'Укажите Telegram ID для уведомлений', done: !!bizSettings?.notification_telegram_id, href: '/settings' },
  ]
  const setupDone = setupSteps.every((s) => s.done)
  const setupCount = setupSteps.filter((s) => s.done).length

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">{business.name}</h1>
      <p className="text-sm text-zinc-400 mb-8">Обзор за сегодня</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Записей сегодня" value={bookingsToday ?? 0} />
        <StatCard label="Клиентов всего" value={totalClients ?? 0} />
        <StatCard label="Сообщений за месяц" value={messagesMonth ?? 0} />
      </div>

      {monthBookingsCount > 0 && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-6">
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Выручка через бота за месяц</p>
          <p className="text-3xl font-semibold text-emerald-900">
            {revenueRubles.toLocaleString('ru-RU')} ₽
          </p>
          <p className="text-sm text-emerald-700 mt-1">{monthBookingsCount} {monthBookingsCount === 1 ? 'запись' : monthBookingsCount < 5 ? 'записи' : 'записей'}</p>
        </div>
      )}

      {upcomingBookings && upcomingBookings.length > 0 && (
        <div className="rounded-xl bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-zinc-900">Ближайшие записи</p>
            <Link href="/bookings" className="text-xs text-zinc-400 hover:text-zinc-700">Все записи →</Link>
          </div>
          <div className="space-y-2">
            {upcomingBookings.map((b) => {
              const svc = Array.isArray(b.services) ? b.services[0] : b.services
              const master = Array.isArray(b.masters) ? b.masters[0] : b.masters
              const client = Array.isArray(b.clients) ? b.clients[0] : b.clients
              const clientName = (client as { preferred_name?: string | null; first_name?: string | null; telegram_username?: string | null } | null)?.preferred_name
                || (client as { preferred_name?: string | null; first_name?: string | null; telegram_username?: string | null } | null)?.first_name
                || ((client as { preferred_name?: string | null; first_name?: string | null; telegram_username?: string | null } | null)?.telegram_username ? `@${(client as { telegram_username: string }).telegram_username}` : 'Клиент')
              const dt = new Date(b.scheduled_at).toLocaleString('ru-RU', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })
              return (
                <div key={b.id} className="flex items-center gap-2 text-sm text-zinc-600 py-1 border-b border-zinc-50 last:border-0">
                  <span className="text-zinc-400 w-28 shrink-0">{dt}</span>
                  <span className="flex-1 truncate">{(svc as { name?: string } | null)?.name ?? '—'}</span>
                  <span className="text-zinc-400 truncate hidden sm:block">{(master as { name?: string } | null)?.name ?? '—'}</span>
                  <span className="text-zinc-500 truncate">{clientName}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!setupDone && (
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-zinc-900">Настройка бота</p>
            <span className="text-xs text-zinc-400">{setupCount} / {setupSteps.length}</span>
          </div>
          <div className="space-y-3">
            {setupSteps.map((step) => (
              <div key={step.label} className="flex items-center gap-3">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${step.done ? 'bg-green-100' : 'bg-zinc-100'}`}>
                  {step.done ? CHECK : <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />}
                </span>
                {step.href && !step.done ? (
                  <Link href={step.href} className="text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2">
                    {step.label}
                  </Link>
                ) : (
                  <span className={`text-sm ${step.done ? 'text-zinc-900' : 'text-zinc-400'}`}>{step.label}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {setupDone && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-6">
          <p className="text-sm font-medium text-green-900">
            {business.telegram_bot_username ? `Бот @${business.telegram_bot_username} работает` : 'Бот настроен и работает'}
          </p>
          <p className="mt-1 text-sm text-green-700">
            AI-ассистент принимает сообщения и помогает клиентам записаться.
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-zinc-900">{value}</p>
    </div>
  )
}
