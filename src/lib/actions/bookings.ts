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
