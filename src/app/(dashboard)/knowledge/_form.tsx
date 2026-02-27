'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  createKnowledgeItem,
  updateKnowledgeItem,
  toggleKnowledgeItem,
  deleteKnowledgeItem,
} from '@/lib/actions/knowledge'
import type { KnowledgeItem } from '@/types/database'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'
const TEXTAREA = `${INPUT} resize-none`
const INIT = { error: null, success: false }

export function AddKnowledgeForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(createKnowledgeItem, INIT)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (state.success) setOpen(false)
  }, [state.success])

  return (
    <div>
      {!open && (
        <button onClick={() => setOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          + Добавить вопрос-ответ
        </button>
      )}

      {open && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-medium text-zinc-900 mb-4">Новый вопрос-ответ</h3>
          <form action={action} className="space-y-3">
            <input type="hidden" name="business_id" value={businessId} />
            <KnowledgeFields />
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

export function KnowledgeRow({ item, businessId }: { item: KnowledgeItem; businessId: string }) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(updateKnowledgeItem, INIT)

  useEffect(() => {
    if (state.success) setEditing(false)
  }, [state.success])

  if (editing) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-medium text-zinc-900 mb-4">Редактировать</h3>
        <form action={action} className="space-y-3">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="business_id" value={businessId} />
          <KnowledgeFields question={item.question} answer={item.answer} />
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
    <div className={`rounded-xl bg-white p-5 shadow-sm ${!item.is_active ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900">В: {item.question}</p>
          <p className="text-sm text-zinc-500 mt-1">О: {item.answer}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setEditing(true)}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
            Изменить
          </button>
          <form action={() => toggleKnowledgeItem(businessId, item.id, item.is_active)}>
            <button type="submit"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50">
              {item.is_active ? 'Скрыть' : 'Показать'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => { if (confirm('Удалить вопрос?')) deleteKnowledgeItem(businessId, item.id) }}
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50">
            Удалить
          </button>
        </div>
      </div>
    </div>
  )
}

function KnowledgeFields({ question = '', answer = '' }: { question?: string; answer?: string }) {
  return (
    <>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Вопрос *</label>
        <input type="text" name="question" defaultValue={question} required
          placeholder="Сколько стоит стрижка?" className={INPUT} />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-700">Ответ *</label>
        <textarea name="answer" defaultValue={answer} required rows={3}
          placeholder="Стрижка стоит от 500₽, зависит от сложности." className={TEXTAREA} />
      </div>
    </>
  )
}
