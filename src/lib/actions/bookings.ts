'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/crypto'
import type { BookingStatus } from '@/types/database'

async function getSessionClient() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, userId: session?.user?.id ?? null }
}

/** Convert a YYYY-MM-DD date in a given timezone to [startUTC, endUTC] ISO strings */
function localDayToUtcRange(dateStr: string, tz: string): [string, string] {
  const toUtc = (localIso: string): string => {
    const probe = new Date(localIso + 'Z')
    const localStr = probe.toLocaleString('sv-SE', { timeZone: tz })
    const localMs = new Date(localStr.replace(' ', 'T') + 'Z').getTime()
    const offset = probe.getTime() - localMs
    return new Date(probe.getTime() + offset).toISOString()
  }
  return [toUtc(`${dateStr}T00:00:00`), toUtc(`${dateStr}T23:59:59`)]
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

export async function rescheduleBooking(
  bookingId: string,
  businessId: string,
  newScheduledAt: string
): Promise<{ error: string | null }> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован' }

  const { error } = await supabase
    .from('bookings')
    .update({ scheduled_at: newScheduledAt })
    .eq('id', bookingId)
    .eq('business_id', businessId)

  if (error) return { error: error.message }

  await notifyClientReschedule(bookingId, businessId, newScheduledAt)

  revalidatePath('/bookings')
  return { error: null }
}

export async function cancelMasterDayBookings(
  masterId: string,
  businessId: string,
  date: string,    // YYYY-MM-DD in business timezone
  timezone: string
): Promise<{ error: string | null; count: number }> {
  const { supabase, userId } = await getSessionClient()
  if (!userId) return { error: 'Не авторизован', count: 0 }

  const [dayStart, dayEnd] = localDayToUtcRange(date, timezone)

  const { data: bookings, error: fetchError } = await supabase
    .from('bookings')
    .select('id')
    .eq('master_id', masterId)
    .eq('business_id', businessId)
    .gte('scheduled_at', dayStart)
    .lte('scheduled_at', dayEnd)
    .in('status', ['confirmed', 'pending'])

  if (fetchError) return { error: fetchError.message, count: 0 }
  if (!bookings || bookings.length === 0) return { error: null, count: 0 }

  const ids = bookings.map((b) => b.id)

  const { error: cancelError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .in('id', ids)
    .eq('business_id', businessId)

  if (cancelError) return { error: cancelError.message, count: 0 }

  for (const id of ids) {
    await notifyClient(id, businessId, 'cancelled')
  }

  revalidatePath('/bookings')
  revalidatePath('/masters')
  return { error: null, count: ids.length }
}

async function notifyClientReschedule(bookingId: string, businessId: string, newScheduledAt: string) {
  try {
    const supabase = await createServiceClient()
    const { data: booking } = await supabase
      .from('bookings')
      .select('businesses(telegram_bot_token, settings), clients(telegram_user_id, first_name), services(name)')
      .eq('id', bookingId)
      .single()

    if (!booking) return

    const biz = Array.isArray(booking.businesses) ? booking.businesses[0] : booking.businesses
    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients
    const service = Array.isArray(booking.services) ? booking.services[0] : booking.services

    if (!biz?.telegram_bot_token || !client?.telegram_user_id) return

    const plainToken = decryptToken(biz.telegram_bot_token)
    const tz = (biz as { settings?: { timezone?: string } } | null)?.settings?.timezone || 'Europe/Moscow'
    const time = new Date(newScheduledAt).toLocaleString('ru-RU', {
      day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz,
    })
    const name = (client as { first_name?: string | null }).first_name ? `, ${(client as { first_name: string }).first_name}` : ''
    const serviceName = (service as { name?: string } | null)?.name ?? 'услуга'
    const text = `📅 Ваша запись перенесена${name}!\nНовое время: ${time} — «${serviceName}». Ждём вас!`

    await fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: (client as { telegram_user_id: number }).telegram_user_id, text }),
    })
  } catch {
    // Best-effort
  }
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
