'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { error: string | null; success: boolean }

async function getSessionClient() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, userId: session?.user?.id ?? null }
}

export async function createService(_prev: Result, formData: FormData): Promise<Result> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const businessId = formData.get('business_id') as string
  const name = (formData.get('name') as string).trim()
  const price = parseInt(formData.get('price') as string, 10)
  const duration = parseInt(formData.get('duration') as string, 10)

  if (!name || isNaN(price) || isNaN(duration)) return { error: 'Заполните все поля', success: false }

  const { error } = await supabase.from('services').insert({
    business_id: businessId,
    name,
    description: (formData.get('description') as string) || null,
    price_kopecks: price * 100,
    duration_minutes: duration,
    is_active: true,
    sort_order: 0,
  })

  if (error) return { error: error.message, success: false }
  revalidatePath('/services')
  return { error: null, success: true }
}

export async function updateService(_prev: Result, formData: FormData): Promise<Result> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const id = formData.get('id') as string
  const businessId = formData.get('business_id') as string
  const name = (formData.get('name') as string).trim()
  const price = parseInt(formData.get('price') as string, 10)
  const duration = parseInt(formData.get('duration') as string, 10)

  if (!name || isNaN(price) || isNaN(duration)) return { error: 'Заполните все поля', success: false }

  const { error } = await supabase
    .from('services')
    .update({
      name,
      description: (formData.get('description') as string) || null,
      price_kopecks: price * 100,
      duration_minutes: duration,
    })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return { error: error.message, success: false }
  revalidatePath('/services')
  return { error: null, success: true }
}

export async function toggleService(businessId: string, id: string, isActive: boolean): Promise<void> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return

  await supabase
    .from('services')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/services')
}

export async function deleteService(businessId: string, id: string): Promise<void> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return

  await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/services')
}
