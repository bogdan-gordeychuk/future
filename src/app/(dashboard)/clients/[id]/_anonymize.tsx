'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { anonymizeClient } from '@/lib/actions/clients'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export function AnonymizeClientButton({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirm, setConfirm] = useState(false)

  const handle = () => {
    startTransition(async () => {
      const res = await anonymizeClient(clientId)
      if (res.success) {
        toast.success('Данные клиента удалены')
        router.refresh()
      } else {
        toast.error(res.error ?? 'Ошибка')
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setConfirm(true)}
        disabled={isPending}
        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Удаление...' : 'Удалить данные клиента'}
      </button>
      <ConfirmModal
        open={confirm}
        message="Удалить персональные данные клиента? Имя, история переписки и привязка к записям будут удалены. Записи сохранятся в статистике анонимно."
        onConfirm={() => { setConfirm(false); handle() }}
        onCancel={() => setConfirm(false)}
      />
    </>
  )
}
