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
  const now = new Date().toISOString()

  let query = supabase
    .from('bookings')
    .select(`*, clients (first_name, last_name, telegram_username), services (name), masters (name)`)
    .eq('business_id', business.id)
    .order('scheduled_at', { ascending: filter === 'upcoming' })
    .limit(100)

  if (filter === 'upcoming') {
    query = query.gte('scheduled_at', now).not('status', 'in', '("cancelled","completed","no_show")')
  } else if (filter === 'pending') {
    query = query.eq('status', 'pending')
  } else {
    query = query.lt('scheduled_at', now)
  }

  const { data: bookings } = await query

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Записи</h1>
      <p className="text-sm text-zinc-400 mb-6">Управление записями клиентов</p>
      <BookingsClient
        bookings={bookings ?? []}
        businessId={business.id}
        timezone={tz}
        currentFilter={filter}
      />
    </div>
  )
}
