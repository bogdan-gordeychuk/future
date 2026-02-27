import { redirect } from 'next/navigation'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { maskToken } from '@/lib/crypto'
import SettingsForm from './_form'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const settings = business.settings as { notification_telegram_id?: string | null; timezone?: string } | null

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
        hasToken={!!business.telegram_bot_token}
        maskedToken={business.telegram_bot_token ? maskToken(business.telegram_bot_token) : null}
      />
    </div>
  )
}
