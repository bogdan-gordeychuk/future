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
  ])

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
