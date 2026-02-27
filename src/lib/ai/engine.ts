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
        description: 'Имя мастера (если клиент указал). Оставь пустым если не указан.',
      },
      preferred_datetime: {
        type: 'string',
        description: 'Желаемая дата и время в формате ISO 8601 (например: 2026-03-01T14:00:00). Если клиент назвал только время — используй ближайшую подходящую дату.',
      },
      notes: {
        type: 'string',
        description: 'Дополнительные пожелания клиента (если есть)',
      },
    },
    required: ['service_name', 'preferred_datetime'],
  },
}

export async function processMessage(
  businessCtx: BusinessContext,
  history: Message[],
  userMessage: string,
  clientId: string
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
    tools: [CREATE_BOOKING_TOOL],
    tool_choice: { type: 'auto' },
  })

  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

  // Check if AI wants to create a booking
  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (toolUse && toolUse.type === 'tool_use' && toolUse.name === 'create_booking') {
    const input = toolUse.input as {
      service_name: string
      master_name?: string
      preferred_datetime: string
      notes?: string
    }

    const bookingCreated = await createPendingBooking(businessCtx, clientId, input)

    const reply = bookingCreated
      ? `Отлично! Заявка на «${input.service_name}» принята. Ожидайте подтверждения от администратора — они свяжутся с вами в ближайшее время. 🗓`
      : `Хотел бы записать вас на «${input.service_name}», но возникла техническая ошибка. Пожалуйста, напишите нам напрямую или попробуйте позже.`

    return { reply, intent: 'booking', tokensUsed, bookingCreated }
  }

  // Regular text response
  const textBlock = response.content.find((b) => b.type === 'text')
  const reply = textBlock && textBlock.type === 'text' ? textBlock.text : ''

  const intent = detectIntent(userMessage)
  return { reply, intent, tokensUsed }
}

async function createPendingBooking(
  ctx: BusinessContext,
  clientId: string,
  input: { service_name: string; master_name?: string; preferred_datetime: string; notes?: string }
): Promise<boolean> {
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
      : ctx.masters[0] ?? null

    // Parse datetime
    let scheduledAt: string
    try {
      scheduledAt = new Date(input.preferred_datetime).toISOString()
    } catch {
      return false
    }

    const { error } = await supabase.from('bookings').insert({
      business_id: ctx.business.id,
      client_id: clientId,
      service_id: service?.id ?? null,
      master_id: master?.id ?? null,
      scheduled_at: scheduledAt,
      duration_minutes: service?.duration_minutes ?? 60,
      price_kopecks: service?.price_kopecks ?? 0,
      status: 'pending',
      notes: input.notes ?? null,
    })

    return !error
  } catch {
    return false
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
