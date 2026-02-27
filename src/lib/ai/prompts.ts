import type { Business, Service, Master, KnowledgeItem, BusinessSettings, WorkingHoursDay } from '@/types/database'

const DAY_NAMES: Record<string, string> = {
  mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг',
  fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье',
}

export interface BusinessContext {
  business: Business
  services: Service[]
  masters: Master[]
  knowledgeItems: KnowledgeItem[]
  bookedSlots?: string[] // formatted busy slots for next 7 days
}

export function buildSystemPrompt(ctx: BusinessContext): string {
  const { business, services, masters, knowledgeItems, bookedSlots } = ctx

  const servicesText = services.length
    ? services
        .map((s) => `- ${s.name}: ${Math.round(s.price_kopecks / 100)}₽, ${s.duration_minutes} мин`)
        .join('\n')
    : 'Услуги не указаны'

  const mastersText = masters.length
    ? masters.map((m) => `- ${m.name}`).join('\n')
    : 'Мастера не указаны'

  const faqText = knowledgeItems.length
    ? knowledgeItems.map((k) => `В: ${k.question}\nО: ${k.answer}`).join('\n\n')
    : ''

  const slotsText = bookedSlots && bookedSlots.length
    ? `\nЗАНЯТОЕ ВРЕМЯ (следующие 7 дней):\n${bookedSlots.join('\n')}\nНе предлагай эти слоты клиентам.\n`
    : ''

  const bizSettings = business.settings as BusinessSettings | null
  const tz = bizSettings?.timezone || 'Europe/Moscow'
  const now = new Date().toLocaleString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: tz,
  })

  const workingHours = bizSettings?.working_hours
  let workingHoursText = ''
  if (workingHours) {
    const lines = Object.entries(workingHours).map(([day, h]) => {
      const wd = h as WorkingHoursDay
      if (!wd.enabled) return `${DAY_NAMES[day] ?? day}: выходной`
      return `${DAY_NAMES[day] ?? day}: ${wd.start}–${wd.end}`
    })
    if (lines.length > 0) {
      workingHoursText = `\nРЕЖИМ РАБОТЫ:\n${lines.join('\n')}\nНе предлагай время вне рабочих часов. Если клиент называет нерабочее время — вежливо скажи когда работаем.\n`
    }
  }

  return `Ты — AI-ассистент записи для бизнеса "${business.name}". Отвечаешь клиентам в Telegram.
Сейчас: ${now} (часовой пояс бизнеса).

ТВОЯ ЗАДАЧА:
1. Отвечать на вопросы об услугах, ценах, мастерах и расписании
2. Помогать клиентам записаться: выяснить услугу, мастера (если нужно) и удобное время
3. Когда клиент указал услугу И время — вызвать инструмент create_booking
4. Быть вежливым, кратким и по делу

БИЗНЕС: ${business.name}
${business.description ? `Описание: ${business.description}` : ''}
${business.address ? `Адрес: ${business.address}` : ''}
${business.phone ? `Телефон: ${business.phone}` : ''}

УСЛУГИ:
${servicesText}

МАСТЕРА:
${mastersText}
${workingHoursText}${slotsText}
${faqText ? `ЧАСТЫЕ ВОПРОСЫ:\n${faqText}\n` : ''}
ПРАВИЛА:
- Всегда отвечай на русском языке
- Будь дружелюбным, но лаконичным (1-3 предложения)
- Если клиент хочет записаться — уточни услугу и желаемое время, ПОТОМ вызови create_booking
- После создания заявки объясни: "Ожидайте подтверждения администратора"
- Не придумывай информацию которой нет — скажи что уточнишь у администратора
- Не обсуждай темы не связанные с бизнесом`
}
