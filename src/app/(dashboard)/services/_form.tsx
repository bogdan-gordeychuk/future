'use client'

import { useActionState, useState } from 'react'
import { createService, updateService, toggleService } from '@/lib/actions/services'
import type { Service } from '@/types/database'

export function AddServiceForm() {
  const [state, action, pending] = useActionState(createService, { error: null })
  const [open, setOpen] = useState(false)

  return (
    <div>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          + Добавить услугу
        </button>
      )}

      {open && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Новая услуга</h3>
          <form action={async (fd) => { await action(fd); setOpen(false) }} className="space-y-3">
            <ServiceFields />
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

export function ServiceRow({ service }: { service: Service }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateService, { error: null })

  if (editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-900 mb-4">Редактировать услугу</h3>
        <form action={async (fd) => { await action(fd); setEditing(false) }} className="space-y-3">
          <input type="hidden" name="id" value={service.id} />
          <ServiceFields
            name={service.name}
            description={service.description ?? ''}
            price={Math.round(service.price_kopecks / 100)}
            duration={service.duration_minutes}
          />
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {pending ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm flex items-center justify-between gap-4 ${!service.is_active ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-zinc-900">{service.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {Math.round(service.price_kopecks / 100)}₽ · {service.duration_minutes} мин
          {service.description && ` · ${service.description}`}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          Изменить
        </button>
        <form action={() => toggleService(service.id, service.is_active)}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            {service.is_active ? 'Скрыть' : 'Показать'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ServiceFields({
  name = '',
  description = '',
  price = 0,
  duration = 60,
}: {
  name?: string
  description?: string
  price?: number
  duration?: number
}) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Название *</label>
        <input
          type="text"
          name="name"
          defaultValue={name}
          required
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Цена (₽) *</label>
          <input
            type="number"
            name="price"
            defaultValue={price || ''}
            min={0}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Длительность (мин) *</label>
          <input
            type="number"
            name="duration"
            defaultValue={duration}
            min={5}
            required
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Описание</label>
        <input
          type="text"
          name="description"
          defaultValue={description}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
        />
      </div>
    </>
  )
}
