import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { BookingsClient } from './_client'
import type { BusinessSettings } from '@/types/database'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const { filter = 'upcoming' } = await searchParams
  const tz = (business.settings as BusinessSettings | null)?.timezone || 'Europe/Moscow'

  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  // Load all recent + upcoming bookings in ONE query — client-side filtering avoids extra round-trips per tab
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`*, clients (first_name, last_name, telegram_username), services (name), masters (name)`)
    .eq('business_id', business.id)
    .gte('scheduled_at', thirtyDaysAgo)
    .order('scheduled_at', { ascending: false })
    .limit(200)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Записи</h1>
      <p className="text-sm text-zinc-400 mb-6">Управление записями клиентов</p>
      <BookingsClient
        bookings={bookings ?? []}
        businessId={business.id}
        timezone={tz}
        initialFilter={filter}
      />
    </div>
  )
}
