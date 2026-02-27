import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import type { Client } from '@/types/database'

type ClientWithStats = Client & {
  message_count: number
  last_booking_at: string | null
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const { q = '' } = await searchParams

  const supabase = await createClient()

  // Load clients with message count and last booking date
  let clientsQuery = supabase
    .from('clients')
    .select('*')
    .eq('business_id', business.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200)

  if (q.trim()) {
    const term = `%${q.trim()}%`
    clientsQuery = clientsQuery.or(
      `first_name.ilike.${term},last_name.ilike.${term},telegram_username.ilike.${term}`
    )
  }

  const { data: clients } = await clientsQuery

  // Load message counts per client using aggregate query
  const { data: messageCounts } = await supabase
    .from('messages')
    .select('client_id')
    .eq('business_id', business.id)
    .eq('role', 'user')

  // Load last booking per client (only need one per client)
  const clientIds = (clients ?? []).map(c => c.id)
  const { data: lastBookings } = clientIds.length > 0
    ? await supabase
        .from('bookings')
        .select('client_id, scheduled_at')
        .eq('business_id', business.id)
        .in('client_id', clientIds)
        .in('status', ['confirmed', 'completed'])
        .order('scheduled_at', { ascending: false })
    : { data: [] }

  // Build lookup maps
  const messageCountMap: Record<string, number> = {}
  for (const msg of messageCounts ?? []) {
    messageCountMap[msg.client_id] = (messageCountMap[msg.client_id] ?? 0) + 1
  }

  const lastBookingMap: Record<string, string> = {}
  for (const booking of lastBookings ?? []) {
    if (!lastBookingMap[booking.client_id]) {
      lastBookingMap[booking.client_id] = booking.scheduled_at
    }
  }

  const clientsWithStats: ClientWithStats[] = (clients ?? []).map((c) => ({
    ...(c as Client),
    message_count: messageCountMap[c.id] ?? 0,
    last_booking_at: lastBookingMap[c.id] ?? null,
  }))

  function formatClientName(client: Client): string {
    const parts = [client.first_name, client.last_name].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
    if (client.telegram_username) return `@${client.telegram_username}`
    return `Клиент #${client.id.slice(0, 8)}`
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Клиенты</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {clientsWithStats.length > 0
              ? `${clientsWithStats.length} клиент${clientsWithStats.length === 1 ? '' : clientsWithStats.length < 5 ? 'а' : 'ов'}`
              : 'Список клиентов бота'}
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Поиск по имени или @username..."
          className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        />
      </form>

      {/* Client list */}
      <div className="space-y-3">
        {clientsWithStats.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="block rounded-xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">
                  {formatClientName(client)}
                </p>
                {client.telegram_username &&
                  (client.first_name || client.last_name) && (
                    <p className="text-xs text-zinc-400 mt-0.5">
                      @{client.telegram_username}
                    </p>
                  )}
              </div>
              <div className="flex items-center gap-6 ml-4 shrink-0 text-right">
                <div>
                  <p className="text-xs text-zinc-400">Последний визит</p>
                  <p className="text-sm text-zinc-700">
                    {formatDate(client.last_visit_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Сообщений</p>
                  <p className="text-sm text-zinc-700">{client.message_count}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Визитов</p>
                  <p className="text-sm text-zinc-700">{client.visit_count}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}

        {clientsWithStats.length === 0 && (
          <div className="rounded-xl bg-white p-10 shadow-sm text-center">
            {q.trim() ? (
              <p className="text-zinc-400 text-sm">
                Клиенты по запросу «{q}» не найдены.
              </p>
            ) : (
              <p className="text-zinc-400 text-sm">
                Пока нет клиентов. Клиенты появятся когда напишут боту.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
