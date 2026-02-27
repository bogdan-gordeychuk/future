'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getBusiness(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data
}

export async function createService(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const business = await getBusiness(supabase, user.id)
  if (!business) return { error: 'Бизнес не найден' }

  const name = (formData.get('name') as string).trim()
  const price = parseInt(formData.get('price') as string, 10)
  const duration = parseInt(formData.get('duration') as string, 10)

  if (!name || isNaN(price) || isNaN(duration)) return { error: 'Заполните все поля' }

  const { error } = await supabase.from('services').insert({
    business_id: business.id,
    name,
    description: formData.get('description') as string || null,
    price_kopecks: price * 100,
    duration_minutes: duration,
    is_active: true,
    sort_order: 0,
  })

  if (error) return { error: error.message }
  revalidatePath('/services')
  return { error: null }
}

export async function updateService(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const business = await getBusiness(supabase, user.id)
  if (!business) return { error: 'Бизнес не найден' }

  const id = formData.get('id') as string
  const name = (formData.get('name') as string).trim()
  const price = parseInt(formData.get('price') as string, 10)
  const duration = parseInt(formData.get('duration') as string, 10)

  if (!name || isNaN(price) || isNaN(duration)) return { error: 'Заполните все поля' }

  const { error } = await supabase
    .from('services')
    .update({
      name,
      description: formData.get('description') as string || null,
      price_kopecks: price * 100,
      duration_minutes: duration,
    })
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) return { error: error.message }
  revalidatePath('/services')
  return { error: null }
}

export async function toggleService(id: string, isActive: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const business = await getBusiness(supabase, user.id)
  if (!business) return

  await supabase
    .from('services')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('business_id', business.id)

  revalidatePath('/services')
}

export async function deleteService(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const business = await getBusiness(supabase, user.id)
  if (!business) return

  await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  revalidatePath('/services')
}
