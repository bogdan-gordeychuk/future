import type { Context } from 'grammy'
import type { SupabaseClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/ai/client'
import type { Business, Master } from '@/types/database'

// Tool definitions for admin pipeline
const SET_MASTER_TIME_OFF_TOOL = {
  name: 'set_master_time_off',
  description: 'Добавить выходной или отпуск для мастера. Блокирует запись на указанные даты.',
  input_schema: {
    type: 'object' as const,
    properties: {
      master_name: {
        type: 'string',
        description: 'Имя мастера',
      },
      date_from: {
        type: 'string',
        description: 'Дата начала в формате YYYY-MM-DD',
      },
      date_to: {
        type: 'string',
        description: 'Дата окончания в формате YYYY-MM-DD',
      },
      reason: {
        type: 'string',
        description: 'Причина (необязательно)',
      },
    },
    required: ['master_name', 'date_from', 'date_to'],
  },
}

const LIST_BOOKINGS_TOOL = {
  name: 'list_bookings',
  description: 'Показать список записей на определённую дату.',
  input_schema: {
    type: 'object' as const,
    properties: {
      date: {
        type: 'string',
        description: 'Дата в формате YYYY-MM-DD. Если "сегодня" или "завтра" — вычисли сам.',
      },
    },
    required: ['date'],
  },
}

const CANCEL_BOOKING_TOOL = {
  name: 'cancel_booking',
  description: 'Отменить запись клиента. Уведомит клиента в Telegram.',
  input_schema: {
    type: 'object' as const,
    properties: {
      booking_id: {
        type: 'string',
        description: 'UUID записи (если известен)',
      },
      master_name: {
        type: 'string',
        description: 'Имя мастера (для поиска по мастеру + дате + времени)',
      },
      date: {
        type: 'string',
        description: 'Дата в формате YYYY-MM-DD',
      },
      time: {
        type: 'string',
        description: 'Время в формате HH:MM',
      },
    },
    required: [],
  },
}

function buildAdminSystemPrompt(business: Business, masters: Master[]): string {
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: (business.settings as { timezone?: string } | null)?.timezone ?? 'Europe/Moscow',
  })
  const mastersList =
    masters.length > 0
      ? masters.map((m) => `• ${m.name}`).join('\n')
      : 'Мастера не добавлены'

  return `Ты — AI-помощник для владельца бизнеса "${business.name}".
Сегодня: ${today}

Мастера:
${mastersList}

Твои возможности:
- Показывать записи на дату (list_bookings)
- Ставить мастеру выходной (set_master_time_off)
- Отменять записи клиентов (cancel_booking)

Отвечай кратко и по делу. Используй инструменты когда нужно выполнить действие.
Если запрос неясен — уточни. Не выполняй действий без чёткого подтверждения владельца.`
}

export async function handleAdminMessage(
  ctx: Context,
  businessId: string,
  business: Business,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>
): Promise<void> {
  const text = ctx.message?.text
  if (!text) return

  const tz =
    (business.settings as { timezone?: string } | null)?.timezone ?? 'Europe/Moscow'

  // Load masters for context
  const { data: masters } = await supabase
    .from('masters')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)

  const masterList = (masters as Master[]) ?? []
  const systemPrompt = buildAdminSystemPrompt(business, masterList)

  // Call Claude Haiku
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }],
    tools: [SET_MASTER_TIME_OFF_TOOL, LIST_BOOKINGS_TOOL, CANCEL_BOOKING_TOOL],
    tool_choice: { type: 'auto' },
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')

  if (!toolUse || toolUse.type !== 'tool_use') {
    // Plain text response
    const textBlock = response.content.find((b) => b.type === 'text')
    const reply = textBlock && textBlock.type === 'text' ? textBlock.text : 'Готово.'
    await ctx.reply(reply)
    return
  }

  if (toolUse.name === 'list_bookings') {
    const input = toolUse.input as { date: string }
    const reply = await handleListBookings(supabase, businessId, input.date, tz)
    await ctx.reply(reply)
    return
  }

  if (toolUse.name === 'set_master_time_off') {
    const input = toolUse.input as {
      master_name: string
      date_from: string
      date_to: string
      reason?: string
    }
    const reply = await handleSetTimeOff(supabase, businessId, masterList, input)
    await ctx.reply(reply)
    return
  }

  if (toolUse.name === 'cancel_booking') {
    const input = toolUse.input as {
      booking_id?: string
      master_name?: string
      date?: string
      time?: string
    }
    const reply = await handleCancelBooking(supabase, businessId, masterList, input, business, tz)
    await ctx.reply(reply)
    return
  }

  await ctx.reply('Не понял команду. Попробуйте ещё раз.')
}

async function handleListBookings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  businessId: string,
  date: string,
  tz: string
): Promise<string> {
  // Build day range in UTC from local date
  const dayStart = new Date(`${date}T00:00:00`)
  const dayEnd = new Date(`${date}T23:59:59`)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, scheduled_at, status, services(name), masters(name), clients(first_name, last_name, preferred_name, telegram_username)')
    .eq('business_id', businessId)
    .gte('scheduled_at', dayStart.toISOString())
    .lte('scheduled_at', dayEnd.toISOString())
    .in('status', ['confirmed', 'pending'])
    .order('scheduled_at', { ascending: true })

  if (error) return `Ошибка загрузки записей: ${error.message}`

  if (!bookings || bookings.length === 0) {
    return `На ${date} записей нет.`
  }

  const lines = bookings.map((b) => {
    const time = new Date(b.scheduled_at).toLocaleString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: tz,
    })
    const svc = Array.isArray(b.services) ? b.services[0] : b.services
    const master = Array.isArray(b.masters) ? b.masters[0] : b.masters
    const client = Array.isArray(b.clients) ? b.clients[0] : b.clients
    const clientName =
      (client as { preferred_name?: string; first_name?: string; last_name?: string; telegram_username?: string } | null)
        ?.preferred_name ??
      [
        (client as { first_name?: string } | null)?.first_name,
        (client as { last_name?: string } | null)?.last_name,
      ]
        .filter(Boolean)
        .join(' ') ??
      (client as { telegram_username?: string } | null)?.telegram_username ??
      'Клиент'
    const svcName = (svc as { name?: string } | null)?.name ?? '—'
    const masterName = (master as { name?: string } | null)?.name ?? '—'
    return `${time} | ${svcName} | ${masterName} | ${clientName}`
  })

  return `Записи на ${date}:\n` + lines.join('\n')
}

async function handleSetTimeOff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  businessId: string,
  masters: Master[],
  input: { master_name: string; date_from: string; date_to: string; reason?: string }
): Promise<string> {
  // Find master
  const master =
    masters.find((m) => m.name.toLowerCase() === input.master_name.toLowerCase()) ??
    masters.find((m) => m.name.toLowerCase().includes(input.master_name.toLowerCase()))

  if (!master) {
    return `Мастер "${input.master_name}" не найден. Доступные: ${masters.map((m) => m.name).join(', ')}`
  }

  // Validate dates
  const start = new Date(input.date_from)
  const end = new Date(input.date_to)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Неверный формат даты. Используйте YYYY-MM-DD.'
  }
  if (end < start) {
    return 'Дата окончания раньше даты начала.'
  }

  const { error } = await supabase
    .from('master_time_off')
    .insert({
      master_id: master.id,
      business_id: businessId,
      date_from: input.date_from,
      date_to: input.date_to,
      reason: input.reason ?? null,
    })

  if (error) return `Ошибка: ${error.message}`

  const dayCount = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return `Выходной для ${master.name} установлен с ${input.date_from} по ${input.date_to} (${dayCount} ${dayCount === 1 ? 'день' : dayCount < 5 ? 'дня' : 'дней'})${input.reason ? `. Причина: ${input.reason}` : ''}.`
}

async function handleCancelBooking(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  businessId: string,
  masters: Master[],
  input: { booking_id?: string; master_name?: string; date?: string; time?: string },
  business: Business,
  tz: string
): Promise<string> {
  let bookingId = input.booking_id

  if (!bookingId) {
    // Find by master + date + time
    if (!input.date) return 'Укажите ID записи или дату для поиска.'

    let query = supabase
      .from('bookings')
      .select('id, scheduled_at, clients(telegram_user_id, first_name, preferred_name)')
      .eq('business_id', businessId)
      .in('status', ['confirmed', 'pending'])

    if (input.date) {
      const dayStart = new Date(`${input.date}T00:00:00`)
      const dayEnd = new Date(`${input.date}T23:59:59`)
      query = query.gte('scheduled_at', dayStart.toISOString()).lte('scheduled_at', dayEnd.toISOString())
    }

    if (input.master_name) {
      const master =
        masters.find((m) => m.name.toLowerCase() === input.master_name!.toLowerCase()) ??
        masters.find((m) => m.name.toLowerCase().includes(input.master_name!.toLowerCase()))
      if (master) query = query.eq('master_id', master.id)
    }

    if (input.time) {
      // Filter by time in timezone
      const { data: allRows } = await query
      if (!allRows || allRows.length === 0) return 'Запись не найдена.'

      const matched = allRows.filter((b) => {
        const t = new Date(b.scheduled_at).toLocaleString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: tz,
        })
        return t === input.time || t.replace(':', '') === input.time!.replace(':', '')
      })

      if (matched.length === 0) return 'Запись не найдена.'
      if (matched.length > 1) return `Найдено несколько записей. Уточните мастера или ID.`
      bookingId = matched[0].id as string
    } else {
      const { data: rows } = await query.order('scheduled_at', { ascending: true }).limit(10)
      if (!rows || rows.length === 0) return 'Записей на эту дату не найдено.'
      if (rows.length > 1) {
        const lines = rows.map((b) => {
          const t = new Date(b.scheduled_at).toLocaleString('ru-RU', {
            hour: '2-digit', minute: '2-digit', timeZone: tz,
          })
          return `${b.id} — ${t}`
        })
        return `Найдено несколько записей. Уточните время или ID:\n${lines.join('\n')}`
      }
      bookingId = rows[0].id as string
    }
  }

  if (!bookingId) return 'Не удалось определить запись для отмены.'

  // Fetch booking with client info before cancelling
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, scheduled_at, clients(telegram_user_id, first_name, preferred_name)')
    .eq('id', bookingId)
    .eq('business_id', businessId)
    .single()

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .eq('business_id', businessId)

  if (error) return `Ошибка отмены: ${error.message}`

  // Notify client in Telegram
  if (booking && business.telegram_bot_token) {
    const client = Array.isArray(booking.clients) ? booking.clients[0] : booking.clients
    const clientTgId = (client as { telegram_user_id?: number } | null)?.telegram_user_id
    if (clientTgId) {
      const clientName =
        (client as { preferred_name?: string } | null)?.preferred_name ??
        (client as { first_name?: string } | null)?.first_name ??
        'Клиент'
      const dt = new Date(booking.scheduled_at).toLocaleString('ru-RU', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: tz,
      })
      const { decryptToken } = await import('@/lib/crypto')
      const plainToken = decryptToken(business.telegram_bot_token)
      fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: clientTgId,
          text: `${clientName}, ваша запись на ${dt} отменена администратором. Свяжитесь с нами для переноса.`,
        }),
      }).catch(() => {})
    }
  }

  return `Запись отменена. Клиент уведомлён.`
}
