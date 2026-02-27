'use client'

import { useActionState, useState } from 'react'
import { createMaster, toggleMaster } from '@/lib/actions/masters'
import type { Master } from '@/types/database'

export function AddMasterForm() {
  const [state, action, pending] = useActionState(createMaster, { error: null })
  const [open, setOpen] = useState(false)

  return (
    <div>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Добавить мастера
        </button>
      )}

      {open && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Новый мастер</h3>
          <form action={async (fd) => { await action(fd); setOpen(false) }} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Имя *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Иван Петров"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {pending ? 'Сохранение...' : 'Добавить'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export function MasterRow({ master }: { master: Master }) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm flex items-center justify-between gap-4 ${!master.is_active ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-zinc-900">{master.name}</p>
        <p className="text-xs text-zinc-400 mt-0.5">
          {master.is_active ? 'Активен' : 'Скрыт'}
        </p>
      </div>
      <form action={() => toggleMaster(master.id, master.is_active)}>
        <button
          type="submit"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          {master.is_active ? 'Скрыть' : 'Показать'}
        </button>
      </form>
    </div>
  )
}
