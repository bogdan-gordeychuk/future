import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { AddServiceForm, ServiceRow } from './_form'
import type { Service } from '@/types/database'

export default async function ServicesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('sort_order')
    .order('created_at')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Услуги</h1>
          <p className="text-sm text-zinc-400 mt-1">Список услуг, доступных для записи</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {(services as Service[] ?? []).map((service) => (
          <ServiceRow key={service.id} service={service} businessId={business.id} />
        ))}
        {(!services || services.length === 0) && (
          <div className="rounded-xl bg-white p-8 shadow-sm text-center">
            <p className="text-zinc-400 text-sm">Услуг пока нет. Добавьте первую.</p>
          </div>
        )}
      </div>

      <AddServiceForm businessId={business.id} />
    </div>
  )
}
