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

  const [bookingsResult, servicesResult, mastersResult] = await Promise.all([
    (() => {
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
      return query
    })(),
    supabase
      .from('services')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('masters')
      .select('id, name')
      .eq('business_id', business.id)
      .eq('is_active', true),
  ])

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Записи</h1>
      <p className="text-sm text-zinc-400 mb-6">Управление записями клиентов</p>
      <BookingsClient
        bookings={bookingsResult.data ?? []}
        businessId={business.id}
        timezone={tz}
        currentFilter={filter}
        services={servicesResult.data ?? []}
        masters={mastersResult.data ?? []}
      />
    </div>
  )
}
