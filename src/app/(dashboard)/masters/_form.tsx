'use client'

import { useActionState, useEffect, useState } from 'react'
import { createMaster, updateMaster, toggleMaster, deleteMaster } from '@/lib/actions/masters'
import type { Master } from '@/types/database'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'
const INIT = { error: null, success: false }

export function AddMasterForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(createMaster, INIT)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.success) setOpen(false)
  }, [state.success])

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
              <input type="text" name="name" required placeholder="Имя специалиста" className={INPUT} />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
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

export function MasterRow({ master, businessId }: { master: Master; businessId: string }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateMaster, INIT)

  useEffect(() => {
    if (state.success) setEditing(false)
  }, [state.success])

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
    <div className={`rounded-xl bg-white p-5 shadow-sm flex items-center justify-between gap-4 ${!master.is_active ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-zinc-900">{master.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5">{master.is_active ? 'Активен' : 'Скрыт'}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button onClick={() => setEditing(true)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
          Изменить
        </button>
        <form action={() => toggleMaster(businessId, master.id, master.is_active)}>
          <button type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
            {master.is_active ? 'Скрыть' : 'Показать'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => { if (confirm(`Удалить специалиста «${master.name}»?`)) deleteMaster(businessId, master.id) }}
          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
          Удалить
        </button>
      </div>
    </div>
  )
}
