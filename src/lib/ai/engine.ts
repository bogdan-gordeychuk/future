import { anthropic } from './client'
import { buildSystemPrompt, type BusinessContext } from './prompts'
import { createServiceClient } from '@/lib/supabase/server'
import type { Message } from '@/types/database'

export type Intent = 'booking' | 'faq' | 'other'

export interface AIResponse {
  reply: string
  intent: Intent
  tokensUsed: number
  bookingCreated?: boolean
}

// Tool definition for Claude
const CREATE_BOOKING_TOOL = {
  name: 'create_booking',
  description: 'Создать заявку на запись клиента. Вызывай ТОЛЬКО когда клиент явно указал услугу и желаемое время/дату. Не вызывай если данных недостаточно — сначала уточни.',
  input_schema: {
    type: 'object' as const,
    properties: {
      service_name: {
        type: 'string',
        description: 'Название услуги из списка услуг бизнеса',
      },
      master_name: {
        type: 'string',
        description: 'Имя мастера. Обязательно если в бизнесе несколько мастеров.',
      },
      slot_number: {
        type: 'integer',
        description: 'Номер окна из списка ДОСТУПНЫЕ ОКНА ровно так, как его назвал клиент. Дату и время не собирай — система подставит их сама по номеру.',
      },
      notes: {
        type: 'string',
        description: 'Дополнительные пожелания клиента (если есть)',
      },
    },
    required: ['service_name', 'slot_number'],
  },
}

const SAVE_CLIENT_NAME_TOOL = {
  name: 'save_client_name',
  description: 'Сохрани имя клиента когда он представился',
  input_schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string', description: 'Имя как представился клиент' }
    },
    required: ['name']
  }
}

const RESCHEDULE_BOOKING_TOOL = {
  name: 'reschedule_booking',
  description: 'Перенести существующую запись клиента на новое время. Вызывай ТОЛЬКО когда клиент явно просит перенести запись и указал новое время. Используй booking_id из раздела ЗАПИСИ КЛИЕНТА.',
  input_schema: {
    type: 'object' as const,
    properties: {
      booking_id: {
        type: 'string',
        description: 'ID записи которую нужно перенести (из раздела ЗАПИСИ КЛИЕНТА)',
      },
      slot_number: {
        type: 'integer',
        description: 'Номер окна из списка ДОСТУПНЫЕ ОКНА ровно так, как его назвал клиент. Дату и время не собирай — система подставит их сама по номеру.',
      },
    },
    required: ['booking_id', 'slot_number'],
  },
}

export async function processMessage(
  businessCtx: BusinessContext,
  history: Message[],
  userMessage: string,
  clientId: string,
  clientName: string | null
): Promise<AIResponse> {
  const systemPrompt = buildSystemPrompt(businessCtx)

  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    ...history.slice(-20).map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages,
    tools: [CREATE_BOOKING_TOOL, SAVE_CLIENT_NAME_TOOL, RESCHEDULE_BOOKING_TOOL],
    tool_choice: { type: 'auto' },
  })

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

  // Check if AI wants to use a tool
  const toolUse = response.content.find((b) => b.type === 'tool_use')

  if (toolUse && toolUse.type === 'tool_use' && toolUse.name === 'save_client_name') {
    const input = toolUse.input as { name: string }
    const name = input.name

    try {
      const supabase = await createServiceClient()
      await supabase
        .from('clients')
        .update({ preferred_name: name })
        .eq('id', clientId)
    } catch {
      // Non-critical: log but don't fail
    }

    return {
      reply: `Приятно познакомиться, ${name}! Чем могу помочь?`,
      intent: 'other',
      tokensUsed,
    }
  }

  if (toolUse && toolUse.type === 'tool_use' && toolUse.name === 'reschedule_booking') {
    const input = toolUse.input as { booking_id: string; slot_number: number }
    const slot = findSlot(businessCtx, input.slot_number)

    if (!slot) {
      return { reply: askForSlotAgain(businessCtx), intent: 'booking', tokensUsed }
    }

    const result = await rescheduleBookingInEngine(clientId, input.booking_id, slot.iso, businessCtx)
    let reply: string
    if (result.success) {
      reply = `Перенесли. Новое время: ${slot.label}. Ждём вас!`
    } else if (result.reason === 'slot_taken') {
      reply = `К сожалению, это время уже заняли. Свободные окна:\n${formatSlots(businessCtx)}`
    } else if (result.reason === 'not_found') {
      reply = `Не нашёл эту запись. Напишите «мои записи», чтобы увидеть актуальный список.`
    } else {
      reply = `Не удалось перенести запись. Пожалуйста, свяжитесь с нами напрямую.`
    }
    return { reply, intent: 'booking', tokensUsed }
  }

  if (toolUse && toolUse.type === 'tool_use' && toolUse.name === 'create_booking') {
    const input = toolUse.input as {
      service_name: string
      master_name?: string
      slot_number: number
      notes?: string
    }

    const slot = findSlot(businessCtx, input.slot_number)

    if (!slot) {
      return { reply: askForSlotAgain(businessCtx), intent: 'booking', tokensUsed }
    }

    const bookingResult = await createPendingBooking(businessCtx, clientId, {
      ...input,
      scheduledAtIso: slot.iso,
    })

    let reply: string
    if (bookingResult.success) {
      // Название услуги и время берём из наших данных, а не из ответа модели:
      // подтверждение не должно расходиться с тем, что реально записано.
      reply = `Записали. ${bookingResult.serviceName ?? input.service_name} — ${slot.label}. Ждём вас! Чтобы отменить, напишите «отменить запись».`
    } else if (bookingResult.reason === 'slot_taken') {
      reply = `К сожалению, это время только что заняли. Свободные окна:\n${formatSlots(businessCtx)}`
    } else if (bookingResult.reason === 'master_wrong_specialization') {
      const service = businessCtx.services.find(
        (s) => s.name.toLowerCase().includes(input.service_name.toLowerCase())
      )
      const suitable = businessCtx.masters.filter(
        (m) => m.is_active && (!m.serviceIds?.length || (service && m.serviceIds.includes(service.id)))
      )
      const names = suitable.map((m) => m.name).join(', ')
      reply = names
        ? `${input.master_name} не выполняет «${input.service_name}». Эту услугу делает: ${names}. К кому записать?`
        : `${input.master_name} не выполняет «${input.service_name}». Уточните, пожалуйста, у администратора.`
    } else {
      reply = `Хотели записать вас на «${input.service_name}», но возникла техническая ошибка. Пожалуйста, напишите нам напрямую или попробуйте позже.`
    }

    return { reply, intent: 'booking', tokensUsed, bookingCreated: bookingResult.success }
  }

  // Regular text response
  const textBlock = response.content.find((b) => b.type === 'text')
  let reply = textBlock && textBlock.type === 'text' ? textBlock.text : ''

  const intent = detectIntent(userMessage)

  // Сюда попадают только ответы без вызова инструментов, то есть записи не было.
  // Модель иногда всё равно пишет «записал» — для клиента это ложное подтверждение:
  // он придёт, а салон о нём не знает. Правила в промпте маленькая модель нарушает,
  // поэтому подменяем такой ответ на уточнение здесь.
  if (CLAIMS_BOOKING_DONE.test(reply) && (businessCtx.availableSlots?.length ?? 0) > 0) {
    reply = askForSlotAgain(businessCtx)
  }

  return { reply, intent, tokensUsed }
}

/** Утверждения о состоявшейся записи. Инфинитивы («записать», «записаться») не ловим. */
const CLAIMS_BOOKING_DONE = /(записал[аи]?|записан[аоы]?|забронировал[аи]?|забронирован[аоы]?)\b/i

/** Ищет окно по номеру, который назвала модель. Номера присваивает сервер. */
function findSlot(ctx: BusinessContext, slotNumber: unknown) {
  const n = Number(slotNumber)
  if (!Number.isInteger(n)) return undefined
  return (ctx.availableSlots ?? []).find((s) => s.number === n)
}

function formatSlots(ctx: BusinessContext): string {
  return (ctx.availableSlots ?? []).map((s) => `${s.number}. ${s.label}`).join('\n')
}

function askForSlotAgain(ctx: BusinessContext): string {
  const slots = ctx.availableSlots ?? []
  if (slots.length === 0) {
    return 'Свободных окон сейчас нет. Пожалуйста, свяжитесь с нами напрямую.'
  }
  return `Уточните, пожалуйста, номер окна:\n${formatSlots(ctx)}`
}

async function createPendingBooking(
  ctx: BusinessContext,
  clientId: string,
  input: { service_name: string; master_name?: string; scheduledAtIso: string; notes?: string }
): Promise<{ success: boolean; reason?: string; serviceName?: string }> {
  try {
    const supabase = await createServiceClient()

    // Find service by name (case-insensitive)
    const service = ctx.services.find(
      (s) => s.name.toLowerCase() === input.service_name.toLowerCase()
    ) ?? ctx.services.find(
      (s) => s.name.toLowerCase().includes(input.service_name.toLowerCase())
    )

    // Find master by name (optional)
    const master = input.master_name
      ? ctx.masters.find(
          (m) => m.name.toLowerCase() === input.master_name!.toLowerCase()
        ) ?? ctx.masters.find(
          (m) => m.name.toLowerCase().includes(input.master_name!.toLowerCase())
        )
      : ctx.masters.length === 1 ? ctx.masters[0] : null

    // Validate specialization: if master has services defined, check they can do this service
    if (master && master.serviceIds && master.serviceIds.length > 0 && service) {
      if (!master.serviceIds.includes(service.id)) {
        return { success: false, reason: 'master_wrong_specialization' }
      }
    }

    const { error } = await supabase.from('bookings').insert({
      business_id: ctx.business.id,
      client_id: clientId,
      service_id: service?.id ?? null,
      master_id: master?.id ?? null,
      scheduled_at: input.scheduledAtIso,
      duration_minutes: service?.duration_minutes ?? 60,
      price_kopecks: service?.price_kopecks ?? 0,
      status: 'confirmed',
      notes: input.notes ?? null,
    })

    if (error) {
      if (error.code === '23505') {
        return { success: false, reason: 'slot_taken' }
      }
      return { success: false }
    }

    return { success: true, serviceName: service?.name }
  } catch {
    return { success: false }
  }
}

async function rescheduleBookingInEngine(
  clientId: string,
  bookingId: string,
  newDatetime: string,
  ctx: BusinessContext
): Promise<{ success: boolean; reason?: string }> {
  try {
    const supabase = await createServiceClient()

    // Verify booking belongs to this client
    const { data: existing } = await supabase
      .from('bookings')
      .select('id, business_id')
      .eq('id', bookingId)
      .eq('client_id', clientId)
      .in('status', ['confirmed', 'pending'])
      .single()

    if (!existing || existing.business_id !== ctx.business.id) {
      return { success: false, reason: 'not_found' }
    }

    let scheduledAt: string
    try {
      scheduledAt = new Date(newDatetime).toISOString()
    } catch {
      return { success: false }
    }

    const { error } = await supabase
      .from('bookings')
      .update({ scheduled_at: scheduledAt })
      .eq('id', bookingId)

    if (error) {
      if (error.code === '23505') return { success: false, reason: 'slot_taken' }
      return { success: false }
    }

    return { success: true }
  } catch {
    return { success: false }
  }
}

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase()
  const bookingKeywords = [
    'записат', 'запишит', 'запись', 'хочу попасть', 'свободн', 'есть время',
    'когда можно', 'приходит', 'приду', 'забронир', 'слот', 'расписание',
  ]
  if (bookingKeywords.some((kw) => lower.includes(kw))) return 'booking'
  return 'faq'
}
