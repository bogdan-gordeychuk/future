import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { AddMasterForm, MasterRow } from './_form'
import type { Master, Service, BusinessSettings } from '@/types/database'

export default async function MastersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const supabase = await createClient()
  const [
    { data: masters },
    { data: services },
    { data: masterServicesRows },
  ] = await Promise.all([
    supabase.from('masters').select('*').eq('business_id', business.id).order('created_at'),
    supabase.from('services').select('id, name').eq('business_id', business.id).eq('is_active', true).order('sort_order'),
    supabase.from('master_services').select('master_id, service_id'),
  ])

  // Build map: master_id → service_id[]
  const masterServiceMap: Record<string, string[]> = {}
  for (const row of (masterServicesRows ?? [])) {
    if (!masterServiceMap[row.master_id]) masterServiceMap[row.master_id] = []
    masterServiceMap[row.master_id].push(row.service_id)
  }

  const enrichedMasters: Master[] = (masters as Master[] ?? []).map((m) => ({
    ...m,
    serviceIds: masterServiceMap[m.id] ?? [],
  }))

  const timezone = (business.settings as BusinessSettings | null)?.timezone ?? 'Europe/Moscow'

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Мастера</h1>
          <p className="text-sm text-zinc-400 mt-1">Сотрудники, к которым можно записаться</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {enrichedMasters.map((master) => (
          <MasterRow
            key={master.id}
            master={master}
            businessId={business.id}
            services={services as Service[] ?? []}
            timezone={timezone}
          />
        ))}
        {enrichedMasters.length === 0 && (
          <div className="rounded-xl bg-white p-8 shadow-sm text-center">
            <p className="text-zinc-400 text-sm">Мастеров пока нет. Добавьте первого.</p>
          </div>
        )}
      </div>

      <AddMasterForm businessId={business.id} services={services as Service[] ?? []} />
    </div>
  )
}
