'use server'

import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function login(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function register(
  _prev: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = (formData.get('business_name') as string).trim()

  if (!businessName) return { error: 'Введите название бизнеса' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return { error: error.message }
  if (!data.user) return { error: 'Не удалось создать аккаунт' }

  const serviceClient = await createServiceClient()
  await serviceClient.from('businesses').insert({
    owner_id: data.user.id,
    name: businessName,
    settings: {
      auto_reply_enabled: true,
      welcome_message: `Привет! Я помощник ${businessName}. Чем могу помочь?`,
      escalation_keywords: ['менеджер', 'человек', 'администратор'],
      working_hours: {
        mon: { start: '09:00', end: '21:00', enabled: true },
        tue: { start: '09:00', end: '21:00', enabled: true },
        wed: { start: '09:00', end: '21:00', enabled: true },
        thu: { start: '09:00', end: '21:00', enabled: true },
        fri: { start: '09:00', end: '21:00', enabled: true },
        sat: { start: '10:00', end: '18:00', enabled: true },
        sun: { start: '10:00', end: '18:00', enabled: false },
      },
    },
  })

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
