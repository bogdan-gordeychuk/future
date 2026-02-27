'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type Result = { error: string | null; success: boolean }

async function getSessionClient() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, userId: session?.user?.id ?? null }
}

export async function createKnowledgeItem(_prev: Result, formData: FormData): Promise<Result> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const businessId = formData.get('business_id') as string
  const question = (formData.get('question') as string).trim()
  const answer = (formData.get('answer') as string).trim()
  if (!question || !answer) return { error: 'Заполните вопрос и ответ', success: false }

  const { error } = await supabase.from('knowledge_items').insert({
    business_id: businessId,
    question,
    answer,
    is_active: true,
    sort_order: 0,
  })

  if (error) return { error: error.message, success: false }
  revalidatePath('/knowledge')
  return { error: null, success: true }
}

export async function updateKnowledgeItem(_prev: Result, formData: FormData): Promise<Result> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const id = formData.get('id') as string
  const businessId = formData.get('business_id') as string
  const question = (formData.get('question') as string).trim()
  const answer = (formData.get('answer') as string).trim()
  if (!question || !answer) return { error: 'Заполните вопрос и ответ', success: false }

  const { error } = await supabase
    .from('knowledge_items')
    .update({ question, answer })
    .eq('id', id)
    .eq('business_id', businessId)

  if (error) return { error: error.message, success: false }
  revalidatePath('/knowledge')
  return { error: null, success: true }
}

export async function toggleKnowledgeItem(businessId: string, id: string, isActive: boolean): Promise<void> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return

  await supabase
    .from('knowledge_items')
    .update({ is_active: !isActive })
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/knowledge')
}

export async function deleteKnowledgeItem(businessId: string, id: string): Promise<void> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return

  await supabase
    .from('knowledge_items')
    .delete()
    .eq('id', id)
    .eq('business_id', businessId)

  revalidatePath('/knowledge')
}
