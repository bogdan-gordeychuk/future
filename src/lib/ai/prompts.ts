import type { Business, Service, Master, KnowledgeItem } from '@/types/database'

export interface BusinessContext {
  business: Business
  services: Service[]
  masters: Master[]
  knowledgeItems: KnowledgeItem[]
}

export function buildSystemPrompt(ctx: BusinessContext): string {
  const { business, services, masters, knowledgeItems } = ctx

  const servicesText = services.length
    ? services
        .map(
          (s) =>
            `- ${s.name}: ${Math.round(s.price_kopecks / 100)}₽, ${s.duration_minutes} мин`
        )
        .join('\n')
    : 'Услуги не указаны'

  const mastersText = masters.length
    ? masters.map((m) => `- ${m.name}`).join('\n')
    : 'Мастера не указаны'

  const faqText = knowledgeItems.length
    ? knowledgeItems
        .map((k) => `В: ${k.question}\nО: ${k.answer}`)
        .join('\n\n')
    : ''

  return `Ты — AI-ассистент записи для бизнеса "${business.name}". Отвечаешь клиентам в Telegram.

ТВОЯ ЗАДАЧА:
1. Отвечать на вопросы об услугах, ценах, мастерах и расписании
2. Помогать клиентам записаться на услугу
3. Быть вежливым, кратким и по делу

БИЗНЕС: ${business.name}
${business.description ? `Описание: ${business.description}` : ''}
${business.address ? `Адрес: ${business.address}` : ''}
${business.phone ? `Телефон: ${business.phone}` : ''}

УСЛУГИ:
${servicesText}

МАСТЕРА:
${mastersText}

${faqText ? `ЧАСТЫЕ ВОПРОСЫ:\n${faqText}\n` : ''}
ПРАВИЛА:
- Всегда отвечай на русском языке
- Будь дружелюбным, но лаконичным (1-3 предложения)
- Если клиент хочет записаться — уточни услугу, мастера (если нужно) и удобное время
- Не придумывай информацию которой нет — скажи что уточнишь у администратора
- Не обсуждай темы не связанные с бизнесом`
}
