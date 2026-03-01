'use client'

import { useTransition, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { updateBookingStatus, rescheduleBooking } from '@/lib/actions/bookings'

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
  bookings: allBookings,
  businessId,
  timezone,
  initialFilter,
}: {
  bookings: Booking[]
  businessId: string
  timezone: string
  initialFilter: string
}) {
  const [activeFilter, setActiveFilter] = useState(initialFilter)

  const now = useMemo(() => new Date(), [])

  const bookings = useMemo(() => {
    if (activeFilter === 'upcoming') {
      return allBookings
        .filter((b) => new Date(b.scheduled_at) >= now && !['cancelled', 'completed', 'no_show'].includes(b.status))
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    }
    if (activeFilter === 'pending') {
      return allBookings.filter((b) => b.status === 'pending')
        .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    }
    // past
    return allBookings
      .filter((b) => new Date(b.scheduled_at) < now)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())
  }, [allBookings, activeFilter, now])

  return (
    <div>
      {/* Filter tabs — client-side, no round-trip */}
      <div className="flex gap-1 mb-6 bg-zinc-100 rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeFilter === f.key
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
          {activeFilter === 'upcoming' && (
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

function RescheduleModal({
  open,
  currentAt,
  timezone,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean
  currentAt: string
  timezone: string
  onConfirm: (isoDatetime: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  // Format current datetime as local datetime-local value for the input default
  const defaultValue = (() => {
    try {
      const d = new Date(currentAt)
      // Format in business timezone as YYYY-MM-DDTHH:MM
      const str = d.toLocaleString('sv-SE', { timeZone: timezone })
      return str.slice(0, 16) // "YYYY-MM-DD HH:MM" → need "YYYY-MM-DDTHH:MM"
        .replace(' ', 'T')
    } catch {
      return ''
    }
  })()

  const [value, setValue] = useState(defaultValue)

  if (!open) return null

  const handleConfirm = () => {
    if (!value) return
    // The datetime-local value is in browser local time. For accuracy we
    // need to convert to UTC. We treat the user's browser as the same tz as the business.
    const iso = new Date(value).toISOString()
    onConfirm(iso)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <p className="text-sm font-medium text-zinc-900 mb-4">Перенести запись</p>
        <label className="text-xs text-zinc-500 block mb-1">Новые дата и время</label>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={isPending || !value}
            className="flex-1 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {isPending ? 'Перенос...' : 'Перенести'}
          </button>
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
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
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  const client = b.clients
  const clientName =
    [client?.first_name, client?.last_name].filter(Boolean).join(' ') ||
    (client?.telegram_username ? `@${client.telegram_username}` : 'Клиент')

  const date = new Date(b.scheduled_at).toLocaleString('ru-RU', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    timeZone: timezone,
  })

  const changeStatus = (status: 'confirmed' | 'cancelled' | 'completed' | 'no_show') => {
    startTransition(async () => {
      await updateBookingStatus(b.id, businessId, status)
    })
  }

  const handleReschedule = (isoDatetime: string) => {
    startTransition(async () => {
      const res = await rescheduleBooking(b.id, businessId, isoDatetime)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Запись перенесена')
        setRescheduleOpen(false)
      }
    })
  }

  const isPendingStatus = b.status === 'pending'
  const isConfirmed = b.status === 'confirmed'
  const isUpcoming = new Date(b.scheduled_at) > new Date()
  const canReschedule = (isPendingStatus || isConfirmed) && isUpcoming

  return (
    <>
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
          <div className="flex flex-wrap gap-2 shrink-0 justify-end">
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
            {isConfirmed && isUpcoming && (
              <button
                onClick={() => changeStatus('completed')}
                disabled={isPending}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Завершить
              </button>
            )}
            {isConfirmed && !isUpcoming && (
              <button
                onClick={() => changeStatus('no_show')}
                disabled={isPending}
                className="rounded-lg border border-orange-200 px-3 py-1.5 text-xs text-orange-600 hover:bg-orange-50 disabled:opacity-50"
              >
                Не пришёл
              </button>
            )}
            {canReschedule && (
              <button
                onClick={() => setRescheduleOpen(true)}
                disabled={isPending}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Перенести
              </button>
            )}
          </div>
        </div>
      </div>
      <RescheduleModal
        open={rescheduleOpen}
        currentAt={b.scheduled_at}
        timezone={timezone}
        onConfirm={handleReschedule}
        onCancel={() => setRescheduleOpen(false)}
        isPending={isPending}
      />
    </>
  )
}
