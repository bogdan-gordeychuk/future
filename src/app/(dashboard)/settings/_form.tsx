'use client'

import { useActionState, useState } from 'react'
import { updateBusiness, connectWebhook } from '@/lib/actions/business'
import type { Business } from '@/types/database'

export default function SettingsForm({ business }: { business: Business }) {
  const [state, action, pending] = useActionState(updateBusiness, { error: null, success: false })
  const [webhookStatus, setWebhookStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [connecting, setConnecting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    setWebhookStatus(null)
    const result = await connectWebhook(business.id)
    setWebhookStatus({ msg: result.error ?? 'Webhook подключён!', ok: result.ok })
    setConnecting(false)
  }

  return (
    <div className="space-y-8">
      {/* Business info form */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-5">Информация о бизнесе</h2>
        <form action={action} className="space-y-4">
          <Field label="Название *" name="name" defaultValue={business.name} required />
          <Field label="Описание" name="description" defaultValue={business.description ?? ''} />
          <Field label="Телефон" name="phone" defaultValue={business.phone ?? ''} />
          <Field label="Адрес" name="address" defaultValue={business.address ?? ''} />
          <Field label="Город" name="city" defaultValue={business.city ?? ''} />

          {state.error && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">Сохранено</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {pending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Bot token section */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-1">Telegram-бот</h2>
        <p className="text-sm text-zinc-500 mb-5">
          Создайте бота через @BotFather, скопируйте токен и нажмите «Подключить».
        </p>
        <form action={action} className="space-y-4">
          <Field
            label="Токен бота"
            name="telegram_bot_token"
            defaultValue={business.telegram_bot_token ?? ''}
            placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
          />
          {/* Hidden fields to keep other values unchanged */}
          <input type="hidden" name="name" value={business.name} />
          <input type="hidden" name="description" value={business.description ?? ''} />
          <input type="hidden" name="phone" value={business.phone ?? ''} />
          <input type="hidden" name="address" value={business.address ?? ''} />
          <input type="hidden" name="city" value={business.city ?? ''} />

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {pending ? 'Сохранение...' : 'Сохранить токен'}
            </button>
            <button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {connecting ? 'Подключение...' : 'Подключить webhook'}
            </button>
          </div>
        </form>

        {webhookStatus && (
          <p className={`mt-3 text-sm ${webhookStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
            {webhookStatus.msg}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
      />
    </div>
  )
}
