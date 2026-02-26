import { anthropic } from './client'
import { buildSystemPrompt, type BusinessContext } from './prompts'
import type { Message } from '@/types/database'

export type Intent = 'booking' | 'faq' | 'other'

export interface AIResponse {
  reply: string
  intent: Intent
  tokensUsed: number
}

const BOOKING_KEYWORDS = [
  'записат', 'запишит', 'запись', 'хочу попасть', 'свободн', 'есть время',
  'когда можно', 'приходит', 'приду', 'забронир', 'слот', 'расписание',
]

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase()
  if (BOOKING_KEYWORDS.some((kw) => lower.includes(kw))) return 'booking'
  return 'faq'
}

export async function processMessage(
  businessCtx: BusinessContext,
  history: Message[],
  userMessage: string
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
  })

  const reply =
    response.content[0].type === 'text' ? response.content[0].text : ''
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

  return {
    reply,
    intent: detectIntent(userMessage),
    tokensUsed,
  }
}
