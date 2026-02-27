import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { maskToken } from '@/lib/crypto'
import SettingsForm from './_form'
import type { Business } from '@/types/database'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .single<Business>()

  if (!business) redirect('/dashboard')

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
        hasToken={!!business.telegram_bot_token}
        maskedToken={business.telegram_bot_token ? maskToken(business.telegram_bot_token) : null}
      />
    </div>
  )
}
