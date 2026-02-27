'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateBusiness, saveBotToken, connectWebhook } from '@/lib/actions/business'
import { BusinessSettings } from '@/types/database'

const INPUT = 'w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 placeholder:text-zinc-400'

type WorkingHoursKey = keyof BusinessSettings['working_hours']

const DAYS: { key: WorkingHoursKey; label: string }[] = [
  { key: 'mon', label: 'Пн' },
  { key: 'tue', label: 'Вт' },
  { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' },
  { key: 'fri', label: 'Пт' },
  { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
]

interface Props {
  businessId: string
  name: string
  description: string
  phone: string
  address: string
  city: string
  timezone: string
  notificationTelegramId: string
  workingHours: BusinessSettings['working_hours']
  hasToken: boolean
  maskedToken: string | null
  webhookConnected: boolean
  botUsername: string | null
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
  businessId, name, description, phone, address, city, timezone, notificationTelegramId, workingHours, hasToken, maskedToken, webhookConnected, botUsername,
}: Props) {
  const router = useRouter()
  const [infoState, infoAction, infoPending] = useActionState(updateBusiness, { error: null, success: false })
  const [botState, botAction, botPending] = useActionState(saveBotToken, { error: null, success: false })
  const [connecting, setConnecting] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [hours, setHours] = useState<BusinessSettings['working_hours']>(workingHours)
  const [selectedTimezone, setSelectedTimezone] = useState(timezone || 'Europe/Moscow')

  useEffect(() => {
    if (infoState.success) toast.success('Настройки сохранены')
    if (infoState.error) toast.error(infoState.error)
  }, [infoState])

  useEffect(() => {
    if (botState.success) { toast.success('Токен сохранён'); setReplacing(false) }
    if (botState.error) toast.error(botState.error)
  }, [botState])

  async function handleConnect() {
    setConnecting(true)
    const result = await connectWebhook(businessId)
    if (result.ok) {
      toast.success('Webhook подключён!')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Ошибка подключения')
    }
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
            <select name="timezone" value={selectedTimezone}
              onChange={e => setSelectedTimezone(e.target.value)}
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

          {/* Working hours hidden inputs */}
          {DAYS.map(({ key }) => (
            <div key={key} style={{ display: 'none' }}>
              <input type="hidden" name={`working_hours_${key}_start`} value={hours[key].start} readOnly />
              <input type="hidden" name={`working_hours_${key}_end`} value={hours[key].end} readOnly />
              <input type="hidden" name={`working_hours_${key}_enabled`} value={hours[key].enabled ? '1' : '0'} readOnly />
            </div>
          ))}

          <button type="submit" disabled={infoPending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
            {infoPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </div>

      {/* Working hours */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-base font-medium text-zinc-900 mb-5">Рабочие часы</h2>
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const day = hours[key]
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="w-6 text-sm font-medium text-zinc-700 flex-shrink-0">{label}</span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={e => setHours(prev => ({
                      ...prev,
                      [key]: { ...prev[key], enabled: e.target.checked },
                    }))}
                    className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
                  />
                  <span className="text-sm text-zinc-600">работаем</span>
                </label>
                <input
                  type="time"
                  value={day.start}
                  disabled={!day.enabled}
                  onChange={e => setHours(prev => ({
                    ...prev,
                    [key]: { ...prev[key], start: e.target.value },
                  }))}
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-40 disabled:bg-zinc-50"
                />
                <span className="text-sm text-zinc-400">—</span>
                <input
                  type="time"
                  value={day.end}
                  disabled={!day.enabled}
                  onChange={e => setHours(prev => ({
                    ...prev,
                    [key]: { ...prev[key], end: e.target.value },
                  }))}
                  className="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-40 disabled:bg-zinc-50"
                />
              </div>
            )
          })}
        </div>
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
          <form action={botAction} className="space-y-4 mb-4">
            <Field label="Токен бота" name="telegram_bot_token" defaultValue=""
              placeholder="1234567890:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw" />

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
          <>
            <div className="mb-4 flex items-center gap-2">
              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${webhookConnected ? 'bg-green-500' : 'bg-zinc-300'}`} />
              {webhookConnected
                ? <span className="text-sm text-green-700">Бот {botUsername ? `@${botUsername}` : ''} подключён</span>
                : <span className="text-sm text-zinc-400">Webhook не подключён — бот не отвечает клиентам</span>
              }
            </div>
            <div className="flex gap-3 flex-wrap">
              <button type="button" onClick={handleConnect} disabled={connecting}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                {connecting ? 'Подключение...' : webhookConnected ? 'Переподключить webhook' : 'Подключить webhook'}
              </button>
            </div>
          </>
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
