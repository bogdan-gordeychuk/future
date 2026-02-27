import { redirect } from 'next/navigation'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { maskToken } from '@/lib/crypto'
import { BusinessSettings } from '@/types/database'
import SettingsForm from './_form'

const DEFAULT_WORKING_HOURS: BusinessSettings['working_hours'] = {
  mon: { start: '09:00', end: '21:00', enabled: true },
  tue: { start: '09:00', end: '21:00', enabled: true },
  wed: { start: '09:00', end: '21:00', enabled: true },
  thu: { start: '09:00', end: '21:00', enabled: true },
  fri: { start: '09:00', end: '21:00', enabled: true },
  sat: { start: '09:00', end: '21:00', enabled: false },
  sun: { start: '09:00', end: '21:00', enabled: false },
}

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const settings = business.settings as BusinessSettings | null

  const workingHours = settings?.working_hours ?? DEFAULT_WORKING_HOURS

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Настройки</h1>
      <p className="text-sm text-zinc-400 mb-8">Профиль бизнеса и подключение бота</p>
      <SettingsForm
        businessId={business.id}
        name={business.name}
        description={business.description ?? ''}
        phone={business.phone ?? ''}
        address={business.address ?? ''}
        city={business.city ?? ''}
        timezone={settings?.timezone ?? ''}
        notificationTelegramId={settings?.notification_telegram_id ?? ''}
        workingHours={workingHours}
        hasToken={!!business.telegram_bot_token}
        maskedToken={business.telegram_bot_token ? maskToken(business.telegram_bot_token) : null}
        webhookConnected={!!business.telegram_bot_username}
        botUsername={business.telegram_bot_username ?? null}
      />
    </div>
  )
}
