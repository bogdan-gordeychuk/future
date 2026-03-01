'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createMaster, updateMaster, toggleMaster, deleteMaster } from '@/lib/actions/masters'
import { cancelMasterDayBookings } from '@/lib/actions/bookings'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import type { Master, Service } from '@/types/database'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'
const INIT = { error: null, success: false }

function ServiceCheckboxes({ services, selected }: { services: Service[]; selected?: string[] }) {
  if (services.length === 0) return null
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-zinc-700">
        Услуги мастера{' '}
        <span className="text-zinc-400 font-normal">(оставьте пустым — делает все услуги)</span>
      </label>
      <div className="flex flex-wrap gap-2 mt-1">
        {services.map((s) => (
          <label key={s.id} className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              name="service_ids"
              value={s.id}
              defaultChecked={selected?.includes(s.id)}
              className="rounded border-zinc-300"
            />
            {s.name}
          </label>
        ))}
      </div>
    </div>
  )
}

export function AddMasterForm({ businessId, services }: { businessId: string; services: Service[] }) {
  const [state, action, pending] = useActionState(createMaster, INIT)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.success) { toast.success('Специалист добавлен'); setOpen(false) }
    if (state.error) toast.error(state.error)
  }, [state])

  return (
    <div>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          + Добавить специалиста
        </button>
      )}
      {open && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Новый специалист</h3>
          <form action={action} className="space-y-3">
            <input type="hidden" name="business_id" value={businessId} />
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Имя *</label>
              <input type="text" name="name" required placeholder="Например: Алёна" className={INPUT} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Должность</label>
              <input
                type="text"
                name="level"
                placeholder="Например: Старший барбер, Бровист, Мастер по ногтям"
                className={INPUT}
              />
            </div>
            <ServiceCheckboxes services={services} />
            <div className="flex gap-2">
              <button type="submit" disabled={pending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
                {pending ? 'Сохранение...' : 'Добавить'}
              </button>
              <button type="button" onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export function MasterRow({
  master,
  businessId,
  services,
  timezone,
}: {
  master: Master
  businessId: string
  services: Service[]
  timezone: string
}) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateMaster, INIT)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelDayOpen, setCancelDayOpen] = useState(false)
  const [cancelDate, setCancelDate] = useState('')
  const [cancelPending, startCancelTransition] = useTransition()

  useEffect(() => {
    if (state.success) { toast.success('Изменения сохранены'); setEditing(false) }
    if (state.error) toast.error(state.error)
  }, [state])

  const handleDelete = async () => {
    await deleteMaster(businessId, master.id)
    toast.success(`Специалист «${master.name}» удалён`)
  }

  const handleCancelDay = () => {
    if (!cancelDate) return
    startCancelTransition(async () => {
      const res = await cancelMasterDayBookings(master.id, businessId, cancelDate, timezone)
      if (res.error) {
        toast.error(res.error)
      } else if (res.count === 0) {
        toast.info(`На ${cancelDate} записей нет`)
      } else {
        toast.success(`Отменено ${res.count} ${countLabel(res.count)}. Клиенты уведомлены.`)
        setCancelDayOpen(false)
        setCancelDate('')
      }
    })
  }

  const handleToggle = async () => {
    await toggleMaster(businessId, master.id, master.is_active)
    toast.success(master.is_active ? 'Специалист скрыт' : 'Специалист активирован')
  }

  const masterServiceNames = services
    .filter((s) => master.serviceIds?.includes(s.id))
    .map((s) => s.name)

  if (editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-900 mb-4">Редактировать специалиста</h3>
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={master.id} />
          <input type="hidden" name="business_id" value={businessId} />
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Имя *</label>
            <input type="text" name="name" defaultValue={master.name} required
              placeholder="Имя специалиста" className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Должность</label>
            <input
              type="text"
              name="level"
              defaultValue={master.level ?? ''}
              placeholder="Например: Старший барбер, Бровист"
              className={INPUT}
            />
          </div>
          <ServiceCheckboxes services={services} selected={master.serviceIds} />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
              {pending ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
              Отмена
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <>
      <div className={`rounded-xl bg-white p-5 shadow-sm flex items-center justify-between gap-4 ${!master.is_active ? 'opacity-50' : ''}`}>
        <div>
          <p className="text-sm font-medium text-zinc-900">{master.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {master.level && <span className="mr-2 font-medium">{master.level}</span>}
            {masterServiceNames.length > 0
              ? masterServiceNames.join(', ')
              : <span className="italic text-zinc-400">Все услуги</span>}
          </p>
          <p className="text-xs text-zinc-300 mt-0.5">{master.is_active ? 'Активен' : 'Скрыт'}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
          <button onClick={() => setEditing(true)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
            Изменить
          </button>
          <button type="button" onClick={() => setCancelDayOpen(true)}
            className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-50">
            Отменить день
          </button>
          <button type="button" onClick={handleToggle}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
            {master.is_active ? 'Скрыть' : 'Показать'}
          </button>
          <button type="button" onClick={() => setConfirmOpen(true)}
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
            Удалить
          </button>
        </div>
      </div>

      {/* Cancel day modal */}
      {cancelDayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <p className="text-sm font-medium text-zinc-900 mb-1">Отменить записи на день</p>
            <p className="text-xs text-zinc-400 mb-4">
              Все записи мастера «{master.name}» на выбранную дату будут отменены, клиенты получат уведомление.
            </p>
            <label className="text-xs text-zinc-500 block mb-1">Дата</label>
            <input
              type="date"
              value={cancelDate}
              onChange={(e) => setCancelDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCancelDay}
                disabled={cancelPending || !cancelDate}
                className="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {cancelPending ? 'Отмена...' : 'Отменить записи'}
              </button>
              <button
                onClick={() => { setCancelDayOpen(false); setCancelDate('') }}
                disabled={cancelPending}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmOpen}
        message={`Удалить специалиста «${master.name}»? Это действие нельзя отменить.`}
        onConfirm={() => { setConfirmOpen(false); handleDelete() }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}

function countLabel(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'запись'
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'записи'
  return 'записей'
}
