'use client'

import { useActionState, useState } from 'react'
import { updateBusiness, saveBotToken, connectWebhook } from '@/lib/actions/business'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'

interface Props {
  businessId: string
  name: string
  description: string
  phone: string
  address: string
  city: string
  timezone: string
  notificationTelegramId: string
  hasToken: boolean
  maskedToken: string | null
}

const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow',      label: 'Москва, Санкт-Петербург (UTC+3)' },
  { value: 'Europe/Samara',      label: 'Самара, Ижевск (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk',          label: 'Омск (UTC+6)' },
  { value: 'Asia/Krasnoyarsk',   label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk',       label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk',       label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok',   label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan',       label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka',     label: 'Камчатка (UTC+12)' },
]

export default function SettingsForm({
  businessId, name, description, phone, address, city, timezone, notificationTelegramId, hasToken, maskedToken,
}: Props) {
  const [infoState, infoAction, infoPending] = useActionState(updateBusiness, { error: null, success: false })
  const [botState, botAction, botPending] = useActionState(saveBotToken, { error: null, success: false })
  const [webhookStatus, setWebhookStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [replacing, setReplacing] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    setWebhookStatus(null)
    const result = await connectWebhook(businessId)
    setWebhookStatus({ msg: result.error ?? 'Webhook подключён!', ok: result.ok })
    setConnecting(false)
  }

  return (
    <div className="space-y-8">
      {/* Business info */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-5">Информация о бизнесе</h2>
        <form action={infoAction} className="space-y-4">
          <Field label="Название *" name="name" defaultValue={name}
            placeholder="Название вашего бизнеса" required />
          <Field label="Описание" name="description" defaultValue={description}
            placeholder="Кратко о том, чем вы занимаетесь" />
          <Field label="Телефон" name="phone" defaultValue={phone}
            placeholder="+7 (999) 000-00-00" />
          <Field label="Адрес" name="address" defaultValue={address}
            placeholder="Улица, дом, офис/кабинет" />
          <Field label="Город" name="city" defaultValue={city}
            placeholder="Москва" />
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Часовой пояс</label>
            <select name="timezone" defaultValue={timezone || 'Europe/Moscow'}
              className={INPUT}>
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
          <Field
            label="Telegram ID для уведомлений о записях"
            name="notification_telegram_id"
            defaultValue={notificationTelegramId}
            placeholder="123456789 — узнать через @userinfobot"
          />

          {infoState.error && <p className="text-sm text-red-600">{infoState.error}</p>}
          {infoState.success && <p className="text-sm text-green-600">Сохранено</p>}

          <button type="submit" disabled={infoPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
            {infoPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Bot token */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-1">Telegram-бот</h2>
        <p className="text-sm text-zinc-500 mb-5">
          Создайте бота через @BotFather, скопируйте токен и нажмите «Сохранить токен».
        </p>

        {/* Show masked token if connected and not replacing */}
        {hasToken && !replacing && (
          <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-mono text-zinc-500">{maskedToken}</span>
            <button
              type="button"
              onClick={() => setReplacing(true)}
              className="text-xs text-zinc-500 hover:text-zinc-800 underline ml-3"
            >
              Заменить
            </button>
          </div>
        )}

        {/* Token input form — shown when no token or replacing */}
        {(!hasToken || replacing) && (
          <form action={async (fd) => { await botAction(fd); setReplacing(false) }} className="space-y-4 mb-4">
            <Field label="Токен бота" name="telegram_bot_token" defaultValue=""
              placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw" />

            {botState.error && <p className="text-sm text-red-600">{botState.error}</p>}
            {botState.success && <p className="text-sm text-green-600">Токен сохранён</p>}

            <div className="flex gap-3 flex-wrap">
              <button type="submit" disabled={botPending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
                {botPending ? 'Сохранение...' : 'Сохранить токен'}
              </button>
              {replacing && (
                <button type="button" onClick={() => setReplacing(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                  Отмена
                </button>
              )}
            </div>
          </form>
        )}

        {hasToken && !replacing && (
          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={handleConnect} disabled={connecting}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
              {connecting ? 'Подключение...' : 'Подключить webhook'}
            </button>
          </div>
        )}

        {webhookStatus && (
          <p className={`mt-3 text-sm ${webhookStatus.ok ? 'text-green-600' : 'text-red-600'}`}>
            {webhookStatus.msg}
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, name, defaultValue, required, placeholder }: {
  label: string
  name: string
  defaultValue: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-zinc-700">{label}</label>
      <input type="text" name={name} defaultValue={defaultValue} required={required}
        placeholder={placeholder} className={INPUT} />
    </div>
  )
}
