'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { error: string | null; success: boolean }

async function getSessionClient() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, userId: session?.user?.id ?? null }
}

export async function createMaster(_prev: Result, formData: FormData): Promise<Result> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const businessId = formData.get('business_id') as string
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Введите имя мастера', success: false }

  const { error } = await supabase.from('masters').insert({
    business_id: businessId,
    name,
    is_active: true,
  })

  if (error) return { error: error.message, success: false }
  revalidatePath('/masters')
  return { error: null, success: true }
}

export async function updateMaster(_prev: Result, formData: FormData): Promise<Result> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const id = formData.get('id') as string
  const businessId = formData.get('business_id') as string
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Введите имя мастера', success: false }

  const { error } = await supabase
    .from('masters')
    .update({ name })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return { error: error.message, success: false }
  revalidatePath('/masters')
  return { error: null, success: true }
}

export async function toggleMaster(businessId: string, id: string, isActive: boolean): Promise<void> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return

  await supabase
    .from('masters')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/masters')
}

export async function deleteMaster(businessId: string, id: string): Promise<void> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return

  await supabase
    .from('masters')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/masters')
}
