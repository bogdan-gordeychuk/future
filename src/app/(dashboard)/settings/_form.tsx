'use client'

import { useActionState, useState } from 'react'
import { updateBusiness, saveBotToken, connectWebhook } from '@/lib/actions/business'
import type { Business } from '@/types/database'

export default function SettingsForm({ business }: { business: Business }) {
  const [infoState, infoAction, infoPending] = useActionState(updateBusiness, { error: null, success: false })
  const [botState, botAction, botPending] = useActionState(saveBotToken, { error: null, success: false })
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
      {/* Business info */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-5">Информация о бизнесе</h2>
        <form action={infoAction} className="space-y-4">
          <Field label="Название *" name="name" defaultValue={business.name}
            placeholder="Барбершоп «Стиль»" required />
          <Field label="Описание" name="description" defaultValue={business.description ?? ''}
            placeholder="Современный барбершоп в центре города" />
          <Field label="Телефон" name="phone" defaultValue={business.phone ?? ''}
            placeholder="+7 (999) 123-45-67" />
          <Field label="Адрес" name="address" defaultValue={business.address ?? ''}
            placeholder="ул. Ленина, 10, офис 3" />
          <Field label="Город" name="city" defaultValue={business.city ?? ''}
            placeholder="Омск" />

          {infoState.error && <p className="text-sm text-red-600">{infoState.error}</p>}
          {infoState.success && <p className="text-sm text-green-600">Сохранено</p>}

          <button
            type="submit"
            disabled={infoPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            {infoPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Bot token — отдельная форма, отдельный action */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-1">Telegram-бот</h2>
        <p className="text-sm text-zinc-500 mb-5">
          Создайте бота через @BotFather, скопируйте токен и нажмите «Подключить».
        </p>
        <form action={botAction} className="space-y-4">
          <Field
            label="Токен бота"
            name="telegram_bot_token"
            defaultValue={business.telegram_bot_token ?? ''}
            placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw"
          />

          {botState.error && <p className="text-sm text-red-600">{botState.error}</p>}
          {botState.success && <p className="text-sm text-green-600">Токен сохранён</p>}

          <div className="flex gap-3 flex-wrap">
            <button
              type="submit"
              disabled={botPending}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {botPending ? 'Сохранение...' : 'Сохранить токен'}
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
  label, name, defaultValue, required, placeholder,
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
        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 placeholder:text-zinc-400"
      />
    </div>
  )
}
