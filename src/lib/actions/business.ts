'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encryptToken, decryptToken } from '@/lib/crypto'
import { invalidateBotCache } from '@/lib/telegram/bot-factory'
import { WorkingHoursDay, BusinessSettings } from '@/types/database'

type WorkingHoursKey = keyof BusinessSettings['working_hours']
const WORKING_HOURS_DAYS: WorkingHoursKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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
  const notifChatId = (formData.get('notification_chat_id') as string)?.trim() || null
  const timezone = (formData.get('timezone') as string)?.trim() || null
  const autoReplyEnabled = formData.get('auto_reply_enabled') === '1'
  const requireMasterSelection = formData.get('require_master_selection') === '1'

  // Parse working_hours from FormData
  const workingHoursEntries = WORKING_HOURS_DAYS.map(day => {
    const start = (formData.get(`working_hours_${day}_start`) as string | null) ?? '09:00'
    const end = (formData.get(`working_hours_${day}_end`) as string | null) ?? '21:00'
    const enabled = formData.get(`working_hours_${day}_enabled`) === '1'
    return [day, { start, end, enabled } satisfies WorkingHoursDay] as const
  })
  const working_hours = Object.fromEntries(workingHoursEntries) as BusinessSettings['working_hours']

  // Merge fields into existing settings JSONB
  const { data: biz } = await supabase
    .from('businesses')
    .select('settings')
    .eq('owner_id', user.id)
    .single()
  const mergedSettings = {
    ...(biz?.settings as object ?? {}),
    notification_telegram_id: notifId,
    notification_chat_id: notifChatId,
    ...(timezone ? { timezone } : {}),
    working_hours,
    auto_reply_enabled: autoReplyEnabled,
    require_master_selection: requireMasterSelection,
  }

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

  // Invalidate bot cache so the new token is picked up on next request
  const { data: bizData } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (bizData?.id) {
    invalidateBotCache(bizData.id)
  }

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
  // Strip trailing slash to prevent double-slash in webhook URL
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
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

  // Save bot username for status display
  try {
    const getMeRes = await fetch(`https://api.telegram.org/bot${plainToken}/getMe`)
    const getMeData = await getMeRes.json()
    if (getMeData.ok) {
      await serviceClient
        .from('businesses')
        .update({ telegram_bot_username: getMeData.result.username ?? null })
        .eq('id', businessId)
    }
  } catch {}

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { error: null, ok: true }
}

export async function getWebhookInfo(businessId: string): Promise<{
  ok: boolean
  url?: string
  lastError?: string
  pendingCount?: number
  error?: string
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Не авторизован' }

  const serviceClient = await createServiceClient()
  const { data: business } = await serviceClient
    .from('businesses')
    .select('telegram_bot_token')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .single()

  if (!business?.telegram_bot_token) return { ok: false, error: 'Токен не найден' }

  const plainToken = decryptToken(business.telegram_bot_token)
  const res = await fetch(`https://api.telegram.org/bot${plainToken}/getWebhookInfo`)
  const data = await res.json()

  if (!data.ok) return { ok: false, error: `Telegram: ${data.description}` }
  return {
    ok: true,
    url: data.result.url || '(не задан)',
    lastError: data.result.last_error_message,
    pendingCount: data.result.pending_update_count,
  }
}

export async function freezeAccount(): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Не авторизован', success: false }

  const { error } = await supabase
    .from('businesses')
    .update({ subscription_status: 'frozen' })
    .eq('owner_id', session.user.id)

  if (error) return { error: error.message, success: false }
  revalidatePath('/billing')
  return { error: null, success: true }
}

export async function unfreezeAccount(): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Не авторизован', success: false }

  // Restore to trial if trial_ends_at is in the future, otherwise expired
  const { data: biz } = await supabase
    .from('businesses')
    .select('trial_ends_at')
    .eq('owner_id', session.user.id)
    .single()

  const newStatus = biz?.trial_ends_at && new Date(biz.trial_ends_at) > new Date()
    ? 'trial'
    : 'expired'

  const { error } = await supabase
    .from('businesses')
    .update({ subscription_status: newStatus })
    .eq('owner_id', session.user.id)

  if (error) return { error: error.message, success: false }
  revalidatePath('/billing')
  return { error: null, success: true }
}

export async function deleteAccount(): Promise<{ error: string | null; success: boolean }> {
  const supabase = await createClient()
  const serviceSupabase = await createServiceClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Не авторизован', success: false }

  // Get business to deactivate Telegram webhook before deleting
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, telegram_bot_token')
    .eq('owner_id', session.user.id)
    .single()

  // Delete Telegram webhook (best-effort, don't fail if it errors)
  if (biz?.telegram_bot_token) {
    try {
      const plainToken = decryptToken(biz.telegram_bot_token)
      await fetch(`https://api.telegram.org/bot${plainToken}/deleteWebhook`, { method: 'POST' })
      if (biz.id) invalidateBotCache(biz.id)
    } catch {
      // Non-critical
    }
  }

  // Delete business (cascades to all related data via ON DELETE CASCADE)
  if (biz?.id) {
    await serviceSupabase.from('businesses').delete().eq('id', biz.id)
  }

  // Delete auth user
  const { error } = await serviceSupabase.auth.admin.deleteUser(session.user.id)
  if (error) return { error: error.message, success: false }

  return { error: null, success: true }
}
