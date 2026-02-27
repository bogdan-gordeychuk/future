'use client'

import { useRouter } from 'next/navigation'
import { useTransition, useActionState, useEffect, useState } from 'react'
import { updateBookingStatus, createManualBooking } from '@/lib/actions/bookings'
import { toast } from 'sonner'

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

type ServiceOption = { id: string; name: string }
type MasterOption = { id: string; name: string }

export function BookingsClient({
  bookings,
  businessId,
  timezone,
  currentFilter,
  services,
  masters,
}: {
  bookings: Booking[]
  businessId: string
  timezone: string
  currentFilter: string
  services: ServiceOption[]
  masters: MasterOption[]
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [formState, formAction, formPending] = useActionState(createManualBooking, { error: null, success: false })

  useEffect(() => {
    if (formState.success) {
      toast.success('Запись создана')
      setShowForm(false)
    }
    if (formState.error) {
      toast.error(formState.error)
    }
  }, [formState])

  return (
    <div>
      {/* Header with create button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 w-fit">
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
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Создать запись
        </button>
      </div>

      {/* Manual booking form */}
      {showForm && (
        <div className="rounded-xl bg-white p-6 shadow-sm mb-6 border border-zinc-200">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Новая запись вручную</h3>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Имя клиента *</label>
                <input
                  type="text"
                  name="client_name"
                  required
                  placeholder="Иван Иванов"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Телефон</label>
                <input
                  type="tel"
                  name="client_phone"
                  placeholder="+7 (999) 000-00-00"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Дата и время *</label>
                <input
                  type="datetime-local"
                  name="scheduled_at"
                  required
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Услуга</label>
                <select
                  name="service_id"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                >
                  <option value="">— не выбрана —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {masters.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Мастер</label>
                  <select
                    name="master_id"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                  >
                    <option value="">— любой —</option>
                    {masters.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className={masters.length > 0 ? '' : 'sm:col-span-2'}>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Примечание</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Пожелания клиента..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={formPending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {formPending ? 'Создание...' : 'Создать запись'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

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
