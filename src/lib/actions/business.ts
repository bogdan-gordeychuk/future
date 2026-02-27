'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/crypto'

export async function updateBusiness(
  _prev: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован', success: false }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: 'Название обязательно', success: false }

  const notifId = (formData.get('notification_telegram_id') as string)?.trim() || null

  // Merge notification_telegram_id into existing settings JSONB
  const { data: biz } = await supabase
    .from('businesses')
    .select('settings')
    .eq('owner_id', user.id)
    .single()
  const mergedSettings = { ...(biz?.settings as object ?? {}), notification_telegram_id: notifId }

  const { error } = await supabase
    .from('businesses')
    .update({
      name,
      description: formData.get('description') as string || null,
      phone: formData.get('phone') as string || null,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      settings: mergedSettings,
      // telegram_bot_token намеренно не трогаем — отдельный action
    })
    .eq('owner_id', user.id)

  if (error) return { error: error.message, success: false }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { error: null, success: true }
}

export async function saveBotToken(
  _prev: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован', success: false }

  const raw = (formData.get('telegram_bot_token') as string).trim()
  const token = raw ? encryptToken(raw) : null

  const { error } = await supabase
    .from('businesses')
    .update({ telegram_bot_token: token })
    .eq('owner_id', user.id)

  if (error) return { error: error.message, success: false }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { error: null, success: true }
}

export async function connectWebhook(businessId: string): Promise<{ error: string | null; ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Не авторизован', ok: false }

  const serviceClient = await createServiceClient()
  const { data: business } = await serviceClient
    .from('businesses')
    .select('telegram_bot_token')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single()

  if (!business?.telegram_bot_token) return { error: 'Сначала сохраните токен бота', ok: false }

  const plainToken = decryptToken(business.telegram_bot_token)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  const webhookUrl = `${appUrl}/api/telegram/webhook?id=${businessId}`

  const res = await fetch(
    `https://api.telegram.org/bot${plainToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ['message'],
        drop_pending_updates: true,
      }),
    }
  )
  const data = await res.json()
  if (!data.ok) return { error: `Telegram: ${data.description}`, ok: false }

  revalidatePath('/settings')
  return { error: null, ok: true }
}
