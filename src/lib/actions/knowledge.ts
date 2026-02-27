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

export async function createKnowledgeItem(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const business = await getBusiness(supabase, user.id)
  if (!business) return { error: 'Бизнес не найден' }

  const question = (formData.get('question') as string).trim()
  const answer = (formData.get('answer') as string).trim()
  if (!question || !answer) return { error: 'Заполните вопрос и ответ' }

  const { error } = await supabase.from('knowledge_items').insert({
    business_id: business.id,
    question,
    answer,
    is_active: true,
    sort_order: 0,
  })

  if (error) return { error: error.message }
  revalidatePath('/knowledge')
  return { error: null }
}

export async function updateKnowledgeItem(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован' }

  const business = await getBusiness(supabase, user.id)
  if (!business) return { error: 'Бизнес не найден' }

  const id = formData.get('id') as string
  const question = (formData.get('question') as string).trim()
  const answer = (formData.get('answer') as string).trim()
  if (!question || !answer) return { error: 'Заполните вопрос и ответ' }

  const { error } = await supabase
    .from('knowledge_items')
    .update({ question, answer })
    .eq('id', id)
    .eq('business_id', business.id)

  if (error) return { error: error.message }
  revalidatePath('/knowledge')
  return { error: null }
}

export async function toggleKnowledgeItem(id: string, isActive: boolean): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const business = await getBusiness(supabase, user.id)
  if (!business) return

  await supabase
    .from('knowledge_items')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('business_id', business.id)

  revalidatePath('/knowledge')
}

export async function deleteKnowledgeItem(id: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const business = await getBusiness(supabase, user.id)
  if (!business) return

  await supabase
    .from('knowledge_items')
    .delete()
    .eq('id', id)
    .eq('business_id', business.id)

  revalidatePath('/knowledge')
}
