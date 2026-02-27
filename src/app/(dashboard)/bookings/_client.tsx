'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { updateBookingStatus } from '@/lib/actions/bookings'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  confirmed: 'Подтверждена',
  cancelled: 'Отменена',
  completed: 'Завершена',
  no_show: 'Не пришёл',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-zinc-100 text-zinc-600',
  no_show: 'bg-orange-100 text-orange-800',
}

const FILTERS = [
  { key: 'upcoming', label: 'Предстоящие' },
  { key: 'pending', label: 'Ожидают подтверждения' },
  { key: 'past', label: 'Прошедшие' },
]

type Booking = {
  id: string
  scheduled_at: string
  status: string
  notes: string | null
  clients: { first_name: string | null; last_name: string | null; telegram_username: string | null } | null
  services: { name: string } | null
  masters: { name: string } | null
}

export function BookingsClient({
  bookings,
  businessId,
  timezone,
  currentFilter,
}: {
  bookings: Booking[]
  businessId: string
  timezone: string
  currentFilter: string
}) {
  const router = useRouter()

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-100 rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => router.push(`/bookings?filter=${f.key}`)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              currentFilter === f.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl bg-white p-12 shadow-sm text-center">
          <p className="text-zinc-400 text-sm">Записей нет.</p>
          {currentFilter === 'upcoming' && (
            <p className="text-zinc-400 text-xs mt-1">
              Подключите бота — клиенты начнут записываться через Telegram.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} businessId={businessId} timezone={timezone} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({
  booking: b,
  businessId,
  timezone,
}: {
  booking: Booking
  businessId: string
  timezone: string
}) {
  const [isPending, startTransition] = useTransition()

  const client = b.clients
  const clientName =
    [client?.first_name, client?.last_name].filter(Boolean).join(' ') ||
    (client?.telegram_username ? `@${client.telegram_username}` : 'Клиент')

  const date = new Date(b.scheduled_at).toLocaleString('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: timezone,
  })

  const changeStatus = (status: 'confirmed' | 'cancelled' | 'completed') => {
    startTransition(async () => {
      await updateBookingStatus(b.id, businessId, status)
    })
  }

  const isPendingStatus = b.status === 'pending'
  const isConfirmed = b.status === 'confirmed'

  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ${isPending ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-zinc-100 text-zinc-600'}`}>
              {STATUS_LABELS[b.status] ?? b.status}
            </span>
            <span className="text-xs text-zinc-400">{date}</span>
          </div>
          <p className="text-sm font-medium text-zinc-900">{clientName}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {b.services?.name ?? '—'}
            {b.masters?.name ? ` · ${b.masters.name}` : ''}
          </p>
          {b.notes && (
            <p className="text-xs text-zinc-400 mt-1 italic">"{b.notes}"</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0">
          {isPendingStatus && (
            <>
              <button
                onClick={() => changeStatus('confirmed')}
                disabled={isPending}
                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Подтвердить
              </button>
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={isPending}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Отменить
              </button>
            </>
          )}
          {isConfirmed && (
            <button
              onClick={() => changeStatus('completed')}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              Завершить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
