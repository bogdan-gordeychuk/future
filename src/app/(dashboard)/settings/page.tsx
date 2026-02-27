import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
      <SettingsForm business={business} />
    </div>
  )
}
