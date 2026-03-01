'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { freezeAccount, unfreezeAccount, deleteAccount } from '@/lib/actions/business'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export function AccountActions({ isFrozen }: { isFrozen: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmFreeze, setConfirmFreeze] = useState(false)

  const handleFreeze = () => {
    startTransition(async () => {
      const res = await freezeAccount()
      if (res.success) {
        toast.success('Аккаунт заморожен. Бот не принимает записи.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Ошибка')
      }
    })
  }

  const handleUnfreeze = () => {
    startTransition(async () => {
      const res = await unfreezeAccount()
      if (res.success) {
        toast.success('Аккаунт возобновлён.')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Ошибка')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteAccount()
      if (res.success) {
        toast.success('Аккаунт удалён.')
        router.push('/')
      } else {
        toast.error(res.error ?? 'Ошибка удаления')
      }
    })
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm mt-4">
      <h2 className="text-sm font-medium text-zinc-900 mb-1">Управление аккаунтом</h2>
      <p className="text-xs text-zinc-400 mb-4">
        Заморозка сохраняет все данные. Удаление необратимо.
      </p>

      <div className="flex flex-col gap-3">
        {isFrozen ? (
          <div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              Аккаунт заморожен — бот не принимает записи
            </p>
            <button
              onClick={handleUnfreeze}
              disabled={isPending}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {isPending ? 'Подождите...' : 'Возобновить аккаунт'}
            </button>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setConfirmFreeze(true)}
              disabled={isPending}
              className="rounded-lg border border-amber-200 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Заморозить аккаунт
            </button>
            <p className="text-xs text-zinc-400 mt-1">
              Данные сохранятся. Бот перестанет отвечать. Возобновите в любой момент.
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-100">
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={isPending}
            className="rounded-lg border border-red-100 px-4 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            Удалить аккаунт навсегда
          </button>
          <p className="text-xs text-zinc-400 mt-1">
            Все данные будут удалены безвозвратно.
          </p>
        </div>
      </div>

      <ConfirmModal
        open={confirmFreeze}
        message="Заморозить аккаунт? Бот перестанет отвечать клиентам. Возобновить можно в любой момент."
        onConfirm={() => { setConfirmFreeze(false); handleFreeze() }}
        onCancel={() => setConfirmFreeze(false)}
      />

      <ConfirmModal
        open={confirmDelete}
        message="Удалить аккаунт? Все ваши данные, мастера, услуги и записи будут удалены безвозвратно. Это действие нельзя отменить."
        onConfirm={() => { setConfirmDelete(false); handleDelete() }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
