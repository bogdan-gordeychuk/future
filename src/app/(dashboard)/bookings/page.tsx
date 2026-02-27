import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не пришёл',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-zinc-100 text-zinc-700',
  no_show: 'bg-orange-100 text-orange-800',
}

export default async function BookingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const supabase = await createClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      clients (first_name, last_name, telegram_username),
      services (name),
      masters (name)
    `)
    .eq('business_id', business.id)
    .order('scheduled_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Записи</h1>
      <p className="text-sm text-zinc-400 mb-8">История и предстоящие записи</p>

      {(!bookings || bookings.length === 0) ? (
        <div className="rounded-xl bg-white p-12 shadow-sm text-center">
          <p className="text-zinc-400 text-sm">Записей пока нет.</p>
          <p className="text-zinc-400 text-xs mt-1">
            Подключите бота, и клиенты начнут записываться через Telegram.
          </p>
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Клиент</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Услуга</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Мастер</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Дата и время</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-zinc-500">Статус</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const client = b.clients as { first_name: string | null; last_name: string | null; telegram_username: string | null } | null
                const service = b.services as { name: string } | null
                const master = b.masters as { name: string } | null
                const clientName = [client?.first_name, client?.last_name].filter(Boolean).join(' ') || client?.telegram_username || '—'
                const date = new Date(b.scheduled_at).toLocaleString('ru-RU', {
                  day: '2-digit', month: '2-digit', year: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })
                return (
                  <tr key={b.id} className="border-b border-zinc-50 last:border-0">
                    <td className="px-5 py-3 text-zinc-900">{clientName}</td>
                    <td className="px-5 py-3 text-zinc-600">{service?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{master?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-zinc-600">{date}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {STATUS_LABELS[b.status] ?? b.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
