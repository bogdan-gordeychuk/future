import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'

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
  ] = await Promise.all([
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .gte('scheduled_at', today),
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
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">{business.name}</h1>
      <p className="text-sm text-zinc-400 mb-8">Обзор за сегодня</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard label="Записей сегодня" value={bookingsToday ?? 0} />
        <StatCard label="Клиентов всего" value={totalClients ?? 0} />
        <StatCard label="Сообщений за месяц" value={messagesMonth ?? 0} />
      </div>

      {!business.telegram_bot_token && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-6">
          <p className="text-sm font-medium text-amber-900">Бот не подключён</p>
          <p className="mt-1 text-sm text-amber-700">
            Добавьте токен Telegram-бота в настройках, чтобы начать принимать записи.
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Настроить бота
          </Link>
        </div>
      )}

      {business.telegram_bot_token && (
        <div className="rounded-xl bg-green-50 border border-green-200 p-6">
          <p className="text-sm font-medium text-green-900">Бот подключён</p>
          <p className="mt-1 text-sm text-green-700">
            AI-ассистент отвечает клиентам в Telegram.
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
