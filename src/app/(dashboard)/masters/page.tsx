import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getBusiness } from '@/lib/supabase/queries'
import { AddMasterForm, MasterRow } from './_form'
import type { Master } from '@/types/database'

export default async function MastersPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const business = await getBusiness(user.id)
  if (!business) redirect('/dashboard')

  const supabase = await createClient()
  const { data: masters } = await supabase
    .from('masters')
    .select('*')
    .eq('business_id', business.id)
    .order('created_at')

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Мастера</h1>
          <p className="text-sm text-zinc-400 mt-1">Сотрудники, к которым можно записаться</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {(masters as Master[] ?? []).map((master) => (
          <MasterRow key={master.id} master={master} businessId={business.id} />
        ))}
        {(!masters || masters.length === 0) && (
          <div className="rounded-xl bg-white p-8 shadow-sm text-center">
            <p className="text-zinc-400 text-sm">Мастеров пока нет. Добавьте первого.</p>
          </div>
        )}
      </div>

      <AddMasterForm businessId={business.id} />
    </div>
  )
}
