import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import type { Client, Message, Booking } from '@/types/database'

type BookingWithService = Booking & {
  services: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не пришёл',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-green-50 text-green-700',
  no_show: 'bg-zinc-100 text-zinc-500',
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const { id } = await params

  const supabase = await createClient()

  // Load client (verify it belongs to this business)
  const { data: clientData } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .single<Client>()

  if (!clientData) notFound()

  // Load messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('client_id', id)
    .eq('business_id', business.id)
    .order('created_at', { ascending: true })
    .limit(500)

  // Load bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, services (name)')
    .eq('client_id', id)
    .eq('business_id', business.id)
    .order('scheduled_at', { ascending: false })
    .limit(50)

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
      month: 'long',
      year: 'numeric',
    })
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const clientName = formatClientName(clientData)

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-700 mb-6 transition-colors"
      >
        ← Все клиенты
      </Link>

      {/* Profile card */}
      <div className="rounded-xl bg-white p-6 shadow-sm mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 mb-4">{clientName}</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {clientData.telegram_username && (
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">Username</p>
              <p className="text-sm text-zinc-700">@{clientData.telegram_username}</p>
            </div>
          )}
          {clientData.phone && (
            <div>
              <p className="text-xs text-zinc-400 mb-0.5">Телефон</p>
              <p className="text-sm text-zinc-700">{clientData.phone}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Визитов</p>
            <p className="text-sm text-zinc-700">{clientData.visit_count}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Последний визит</p>
            <p className="text-sm text-zinc-700">{formatDate(clientData.last_visit_at)}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Зарегистрирован</p>
            <p className="text-sm text-zinc-700">{formatDate(clientData.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Bookings */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          Записи{bookings && bookings.length > 0 ? ` (${bookings.length})` : ''}
        </h2>
        {bookings && bookings.length > 0 ? (
          <div className="space-y-2">
            {(bookings as BookingWithService[]).map((booking) => (
              <div
                key={booking.id}
                className="rounded-xl bg-white p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {booking.services?.name ?? 'Услуга не указана'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatDateTime(booking.scheduled_at)}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    STATUS_COLORS[booking.status] ?? 'bg-zinc-100 text-zinc-500'
                  }`}
                >
                  {STATUS_LABELS[booking.status] ?? booking.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 shadow-sm text-center">
            <p className="text-zinc-400 text-sm">Записей нет</p>
          </div>
        )}
      </div>

      {/* Chat history */}
      <div>
        <h2 className="text-base font-semibold text-zinc-900 mb-3">
          История чата{messages && messages.length > 0 ? ` (${messages.length})` : ''}
        </h2>
        {messages && messages.length > 0 ? (
          <div className="rounded-xl bg-white p-4 shadow-sm space-y-3 max-h-[600px] overflow-y-auto">
            {(messages as Message[]).map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-zinc-100 text-zinc-900 rounded-tr-sm'
                      : 'bg-white border border-zinc-200 text-zinc-900 rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-zinc-400 text-right' : 'text-zinc-400'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white p-6 shadow-sm text-center">
            <p className="text-zinc-400 text-sm">Сообщений нет</p>
          </div>
        )}
      </div>
    </div>
  )
}
