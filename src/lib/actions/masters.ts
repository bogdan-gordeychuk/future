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

export async function createMaster(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const business = await getBusiness(supabase, user.id)
  if (!business) return { error: 'Бизнес не найден' }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Введите имя мастера' }

  const { error } = await supabase.from('masters').insert({
    business_id: business.id,
    name,
    is_active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/masters')
  return { error: null }
}

export async function updateMaster(
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
  if (!name) return { error: 'Введите имя мастера' }

  const { error } = await supabase
    .from('masters')
    .update({ name })
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) return { error: error.message }
  revalidatePath('/masters')
  return { error: null }
}

export async function toggleMaster(id: string, isActive: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const business = await getBusiness(supabase, user.id)
  if (!business) return

  await supabase
    .from('masters')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('business_id', business.id)

  revalidatePath('/masters')
}

export async function deleteMaster(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const business = await getBusiness(supabase, user.id)
  if (!business) return

  await supabase
    .from('masters')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  revalidatePath('/masters')
}
