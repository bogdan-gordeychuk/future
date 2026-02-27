'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import type { BookingStatus } from '@/types/database'

export async function createManualBooking(
  _prev: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean }> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', success: false }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .single()

  if (!business) return { error: 'Бизнес не найден', success: false }

  const clientName = (formData.get('client_name') as string)?.trim()
  const clientPhone = (formData.get('client_phone') as string)?.trim() || null
  const serviceId = (formData.get('service_id') as string) || null
  const masterId = (formData.get('master_id') as string) || null
  const scheduledAt = (formData.get('scheduled_at') as string)?.trim()
  const notes = (formData.get('notes') as string)?.trim() || null

  if (!clientName) return { error: 'Укажите имя клиента', success: false }
  if (!scheduledAt) return { error: 'Укажите дату и время', success: false }

  let scheduledAtIso: string
  try {
    scheduledAtIso = new Date(scheduledAt).toISOString()
    if (isNaN(new Date(scheduledAt).getTime())) throw new Error('invalid')
  } catch {
    return { error: 'Неверный формат даты и времени', success: false }
  }

  // Get service details for price/duration
  let durationMinutes = 60
  let priceKopecks = 0
  if (serviceId) {
    const { data: svc } = await supabase
      .from('services')
      .select('duration_minutes, price_kopecks')
      .eq('id', serviceId)
      .eq('business_id', business.id)
      .single()
    if (svc) {
      durationMinutes = svc.duration_minutes
      priceKopecks = svc.price_kopecks
    }
  }

  // Find or create a "manual" client record (no telegram_user_id)
  const serviceClient = await createServiceClient()
  const { data: existingClient } = await serviceClient
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('first_name', clientName)
    .is('telegram_user_id', null)
    .maybeSingle()

  let clientId: string
  if (existingClient) {
    clientId = existingClient.id
    // Update phone if provided
    if (clientPhone) {
      await serviceClient
        .from('clients')
        .update({ phone: clientPhone })
        .eq('id', clientId)
    }
  } else {
    // Create a manual client (no telegram_user_id — requires migration 006)
    const { data: newClient, error: clientError } = await serviceClient
      .from('clients')
      .insert({
        business_id: business.id,
        telegram_user_id: null,
        first_name: clientName,
        phone: clientPhone,
        source: 'manual',
      })
      .select('id')
      .single()

    if (clientError || !newClient) {
      return { error: 'Ошибка создания клиента: ' + (clientError?.message ?? ''), success: false }
    }
    clientId = newClient.id
  }

  const { error } = await serviceClient.from('bookings').insert({
    business_id: business.id,
    client_id: clientId,
    service_id: serviceId,
    master_id: masterId || null,
    scheduled_at: scheduledAtIso,
    duration_minutes: durationMinutes,
    price_kopecks: priceKopecks,
    status: 'confirmed',
    notes,
  })

  if (error) return { error: error.message, success: false }

  revalidatePath('/bookings')
  revalidatePath('/dashboard')
  return { error: null, success: true }
}

async function getSessionClient() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, userId: session?.user?.id ?? null }
}

export async function updateBookingStatus(
  bookingId: string,
  businessId: string,
  status: BookingStatus
): Promise<{ error: string | null }> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
    .eq('business_id', businessId)

  if (error) return { error: error.message }

  // Notify client if confirmed or cancelled
  if (status === 'confirmed' || status === 'cancelled') {
    await notifyClient(bookingId, businessId, status)
  }

  revalidatePath('/bookings')
  return { error: null }
}

async function notifyClient(bookingId: string, businessId: string, status: 'confirmed' | 'cancelled') {
  try {
    const supabase = await createServiceClient()

    const { data: booking } = await supabase
      .from('bookings')
      .select('scheduled_at, businesses(telegram_bot_token, settings), clients(telegram_user_id, first_name), services(name)')
      .eq('id', bookingId)
      .single()

    if (!booking) return

    const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients
    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services

    if (!biz?.telegram_bot_token || !client?.telegram_user_id) return

    const plainToken = decryptToken(biz.telegram_bot_token)
    const tz = (biz as { settings?: { timezone?: string } } | null)?.settings?.timezone || 'Europe/Moscow'

    const time = new Date(booking.scheduled_at).toLocaleString('ru-RU', {
      day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz,
    })

    const name = client.first_name ? `, ${client.first_name}` : ''
    const serviceName = service?.name ?? 'услуга'

    const text = status === 'confirmed'
      ? `✅ Ваша запись подтверждена${name}!\n📅 ${time} — «${serviceName}». Ждём вас!`
      : `❌ К сожалению, ваша заявка на «${serviceName}» (${time}) отменена. Свяжитесь с нами для уточнений.`

    await fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: client.telegram_user_id, text }),
    })
  } catch {
    // Silent — notification is best-effort
  }
}
