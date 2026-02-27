import { Bot, type Context } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { processMessage } from '@/lib/ai/engine'
import { checkRateLimit } from './rate-limiter'
import { decryptToken } from '@/lib/crypto'
import type { Business, Service, Master, KnowledgeItem, Client, Message, BusinessSettings } from '@/types/database'

// Cache bot instances: businessId → Bot
const botCache = new Map<string, Bot>()

// BookingRow type for client self-cancellation feature
interface BookingRow {
  id: string
  scheduled_at: string
  status: string
  service_name: string | null
}

// Cache of upcoming bookings per telegram user id (for cancellation flow)
const userBookingsCache = new Map<number, BookingRow[]>()

// Fallback message shown to client when AI is unavailable (limits, errors)
// Client does NOT know it's a limit issue — this is intentional
const CLIENT_FALLBACK_MSG =
  'Добрый день! Я передам ваше сообщение администратору, он свяжется с вами в ближайшее время.'

// Structured logging helpers
function log(bizId: string, msg: string, data?: unknown) {
  const prefix = `[bot:${bizId.slice(0, 8)}]`
  data !== undefined ? console.log(prefix, msg, data) : console.log(prefix, msg)
}

function logError(bizId: string, msg: string, err: unknown) {
  const errInfo = err instanceof Error ? { message: err.message, stack: err.stack } : err
  console.error(`[bot:${bizId.slice(0, 8)}]`, msg, errInfo)
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
type DayKey = typeof DAY_KEYS[number]

function generateAvailableSlots(
  workingHours: BusinessSettings['working_hours'],
  bookedSlotsRaw: Array<{ scheduled_at: string }>,
  tz: string,
  serviceDurationMin?: number
): string[] {
  const duration = serviceDurationMin ?? 60
  const bookedTimes = bookedSlotsRaw.map((b) => new Date(b.scheduled_at).getTime())

  const result: string[] = []
  let workingDaysFound = 0

  const today = new Date()
  // Start from tomorrow
  const startDate = new Date(today)
  startDate.setDate(today.getDate() + 1)

  for (let dayOffset = 0; dayOffset < 14 && workingDaysFound < 3; dayOffset++) {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + dayOffset)

    // Get day of week in business timezone
    const dayOfWeek = new Date(
      date.toLocaleString('en-US', { timeZone: tz })
    ).getDay() // 0=Sun, 1=Mon, ...

    const dayKey = DAY_KEYS[dayOfWeek]
    const dayConfig = workingHours[dayKey]

    if (!dayConfig || !dayConfig.enabled) continue

    // Parse start/end times
    const [startHour, startMin] = dayConfig.start.split(':').map(Number)
    const [endHour, endMin] = dayConfig.end.split(':').map(Number)

    // Build date string in business timezone for slot generation
    const dateStr = date.toLocaleDateString('en-CA', { timeZone: tz }) // YYYY-MM-DD

    const daySlots: string[] = []

    let slotHour = startHour
    let slotMin = startMin

    while (
      slotHour < endHour ||
      (slotHour === endHour && slotMin < endMin)
    ) {
      // Build ISO string for this slot in the business timezone
      const slotDateStr = `${dateStr}T${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}:00`
      // Parse as local time in tz
      const slotDate = new Date(
        new Date(slotDateStr).toLocaleString('en-US', { timeZone: tz })
      )
      // Actually we need to create the date properly
      // Use a different approach: create UTC time from the tz-local time
      const slotMs = new Date(`${dateStr}T${String(slotHour).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}:00`).getTime()

      // Check if slot conflicts with booked times (±30 min)
      const isBooked = bookedTimes.some(
        (bt) => Math.abs(bt - slotMs) < 30 * 60 * 1000
      )

      if (!isBooked) {
        // Format slot in Russian
        const slotFormatted = new Date(slotMs).toLocaleString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: tz,
        })
        daySlots.push(slotFormatted)
      }

      // Advance by duration
      slotMin += duration
      while (slotMin >= 60) {
        slotMin -= 60
        slotHour++
      }

      if (daySlots.length >= 4) break
    }

    if (daySlots.length > 0) {
      result.push(...daySlots.slice(0, 4))
      workingDaysFound++
    }
  }

  return result
}

export async function getOrCreateBot(plainToken: string, businessId: string): Promise<Bot> {
  if (botCache.has(businessId)) return botCache.get(businessId)!

  const bot = new Bot(plainToken)
  setupHandlers(bot, businessId, plainToken)
  // GrammY requires bot.init() before webhookCallback can parse commands
  await bot.init()
  botCache.set(businessId, bot)
  return bot
}

function setupHandlers(bot: Bot, businessId: string, plainToken: string) {
  bot.command('start', async (ctx) => {
    const supabase = await createServiceClient()
    try {
      const { data: business, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single<Business>()

      if (error || !business) {
        log(businessId, '/start: business not found in DB')
        await ctx.reply('Бот не настроен. Обратитесь к администратору.')
        return
      }

      const settings = business.settings as { welcome_message?: string } | null

      // Custom welcome message takes priority
      if (settings?.welcome_message) {
        log(businessId, `/start: custom welcome to tgUser=${ctx.from?.id}`)
        await ctx.reply(settings.welcome_message)
        return
      }

      // Smart welcome: load active services to show in greeting
      const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order')
        .limit(10)

      let welcome = `Привет! Я виртуальный администратор — ${business.name}.`

      if (services && services.length > 0) {
        welcome += '\n\nНаши услуги:\n'
        welcome += (services as Service[])
          .map((s) => `• ${s.name} — ${Math.round(s.price_kopecks / 100)} ₽, ${s.duration_minutes} мин`)
          .join('\n')
        welcome += '\n\nНапишите что вас интересует или скажите «хочу записаться» — я помогу подобрать удобное время.'
      } else {
        welcome += '\n\nНапишите что вас интересует — я отвечу на ваши вопросы и помогу записаться.'
      }

      log(businessId, `/start: smart welcome to tgUser=${ctx.from?.id} services=${services?.length ?? 0}`)
      await ctx.reply(welcome)
    } catch (err) {
      logError(businessId, '/start unhandled error:', err)
      await ctx.reply('Произошла ошибка. Попробуйте позже.')
    }
  })

  bot.on('message:text', async (ctx) => {
    const telegramUserId = ctx.from?.id
    if (!telegramUserId) return

    log(businessId, `msg from tgUser=${telegramUserId}: "${ctx.message.text.slice(0, 60)}"`)

    // Rate limit
    if (!checkRateLimit(telegramUserId)) {
      log(businessId, `rate limit hit for tgUser=${telegramUserId}`)
      await ctx.reply('Подождите немного — слишком много сообщений.')
      return
    }

    const supabase = await createServiceClient()

    // Step 1: Get business
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single<Business>()

    if (bizError || !business) {
      logError(businessId, 'DB error fetching business:', bizError)
      return
    }

    // Step 2: Check trial expiry by date
    const now = new Date()
    const trialExpiredByDate =
      business.subscription_status === 'trial' &&
      business.trial_ends_at !== null &&
      new Date(business.trial_ends_at) < now
    const subExpired =
      business.subscription_status === 'expired' || business.subscription_status === 'cancelled'

    if (trialExpiredByDate || subExpired) {
      log(businessId, `access blocked: trialByDate=${trialExpiredByDate} subExpired=${subExpired}`)
      // Notify owner, not client — client gets generic fallback
      const notifId = (business.settings as { notification_telegram_id?: string | null } | null)
        ?.notification_telegram_id
      if (notifId && notifId !== telegramUserId.toString()) {
        const plainToken = decryptToken(business.telegram_bot_token!)
        const reason = trialExpiredByDate ? 'истёк пробный период' : 'подписка отменена/истекла'
        fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: notifId,
            text: `⚠️ Бот не может ответить клиенту — ${reason}.\nСообщение клиента: «${ctx.message.text}»\n\nОформите подписку в личном кабинете: ${process.env.NEXT_PUBLIC_APP_URL}/billing`,
          }),
        }).catch(() => {})
      }
      await ctx.reply(CLIENT_FALLBACK_MSG)
      return
    }

    // Step 3: Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .single()

    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = no rows found, not an error for us
      logError(businessId, 'DB error fetching subscription:', subError)
    }

    // Step 4: Check message limit
    const limitExceeded =
      subscription &&
      subscription.messages_limit !== -1 &&
      subscription.messages_used >= subscription.messages_limit

    if (limitExceeded) {
      const isTrial = subscription.plan === 'trial'
      log(
        businessId,
        `limit exceeded: plan=${subscription.plan} used=${subscription.messages_used}/${subscription.messages_limit}`
      )
      // Notify owner silently — client gets generic fallback, no mention of limits
      const notifId = (business.settings as { notification_telegram_id?: string | null } | null)
        ?.notification_telegram_id
      if (notifId && notifId !== telegramUserId.toString()) {
        const plainToken = decryptToken(business.telegram_bot_token!)
        const reason = isTrial
          ? `исчерпан лимит пробного периода (${subscription.messages_used}/${subscription.messages_limit} сообщений)`
          : `исчерпан месячный лимит сообщений (${subscription.messages_used}/${subscription.messages_limit})`
        fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: notifId,
            text: `⚠️ AI-ассистент отключён — ${reason}.\nСообщение клиента: «${ctx.message.text}»\n\n${isTrial ? `Оформите подписку: ${process.env.NEXT_PUBLIC_APP_URL}/billing` : `Обновите подписку: ${process.env.NEXT_PUBLIC_APP_URL}/billing`}`,
          }),
        }).catch(() => {})
      }
      await ctx.reply(CLIENT_FALLBACK_MSG)
      return
    }

    // Step 5: Upsert client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          business_id: business.id,
          telegram_user_id: telegramUserId,
          telegram_username: ctx.from?.username ?? null,
          first_name: ctx.from?.first_name ?? null,
          last_name: ctx.from?.last_name ?? null,
        },
        { onConflict: 'business_id,telegram_user_id' }
      )
      .select()
      .single<Client>()

    if (clientError || !client) {
      logError(businessId, `DB error upserting client (tgUser=${telegramUserId}):`, clientError)
      await ctx.reply('Произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.')
      return
    }

    // Step 6: Save user message
    const { error: userMsgError } = await supabase.from('messages').insert({
      business_id: business.id,
      client_id: client.id,
      role: 'user',
      content: ctx.message.text,
      tokens_used: 0,
    })
    if (userMsgError) {
      logError(businessId, `DB error saving user message (client=${client.id}):`, userMsgError)
    }

    // Step 7: Load context in parallel
    const now7d = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    const tz =
      (business.settings as { timezone?: string } | null)?.timezone || 'Europe/Moscow'

    const [
      { data: services, error: svcError },
      { data: masters, error: masterError },
      { data: knowledgeItems, error: kbError },
      { data: history, error: histError },
      { data: upcomingBookings, error: bookError },
    ] = await Promise.all([
      supabase
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('masters')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true),
      supabase
        .from('knowledge_items')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('messages')
        .select('*')
        .eq('business_id', business.id)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('bookings')
        .select('scheduled_at, services(name)')
        .eq('business_id', business.id)
        .gte('scheduled_at', new Date().toISOString())
        .lte('scheduled_at', now7d)
        .in('status', ['pending', 'confirmed']),
    ])

    if (svcError) logError(businessId, 'DB error loading services:', svcError)
    if (masterError) logError(businessId, 'DB error loading masters:', masterError)
    if (kbError) logError(businessId, 'DB error loading knowledge_items:', kbError)
    if (histError) logError(businessId, `DB error loading history (client=${client.id}):`, histError)
    if (bookError) logError(businessId, 'DB error loading upcoming bookings:', bookError)

    // Format booked slots for AI context
    const bookedSlots = (upcomingBookings ?? []).map((b) => {
      const svc = Array.isArray(b.services) ? b.services[0] : b.services
      const time = new Date(b.scheduled_at).toLocaleString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: tz,
      })
      return `- ${time}${svc?.name ? ` (${svc.name})` : ''}`
    })

    // Generate available slots for the next 14 days
    const bizSettings = business.settings as BusinessSettings | null
    const workingHours = bizSettings?.working_hours
    const bookedSlotsRaw = (upcomingBookings ?? []).map((b) => ({ scheduled_at: b.scheduled_at }))

    // Determine service duration from first service or default 60
    const firstService = services && services.length > 0 ? (services as Service[])[0] : null
    const serviceDuration = firstService?.duration_minutes ?? 60

    const availableSlots = workingHours
      ? generateAvailableSlots(workingHours, bookedSlotsRaw, tz, serviceDuration)
      : []

    // Client name: prefer preferred_name, then first_name
    const clientName = client.preferred_name || client.first_name || null

    let reply: string

    // Step 8: Call AI
    try {
      log(businessId, `calling AI (client=${client.id} services=${services?.length ?? 0})`)
      const result = await processMessage(
        {
          business,
          services: (services as Service[]) ?? [],
          masters: (masters as Master[]) ?? [],
          knowledgeItems: (knowledgeItems as KnowledgeItem[]) ?? [],
          bookedSlots,
          clientName,
          availableSlots,
        },
        ((history as Message[]) ?? []).reverse(),
        ctx.message.text,
        client.id,
        clientName
      )

      reply = result.reply
      log(
        businessId,
        `AI done: intent=${result.intent} tokens=${result.tokensUsed} booking=${result.bookingCreated ?? false}`
      )

      // Notify business owner on booking intent
      const notifId = (
        business.settings as { notification_telegram_id?: string | null } | null
      )?.notification_telegram_id
      if (notifId && notifId !== telegramUserId.toString() && (result.bookingCreated || result.intent === 'booking')) {
        const clientDisplayName =
          [client.first_name, client.last_name].filter(Boolean).join(' ') ||
          (ctx.from?.username ? `@${ctx.from.username}` : 'Клиент')
        const notifText = result.bookingCreated
          ? `📅 Новая заявка на запись!\n👤 ${clientDisplayName}\n💬 «${ctx.message.text}»\n\nОткройте панель для подтверждения.`
          : `💬 Клиент интересуется записью:\n👤 ${clientDisplayName}\n💬 «${ctx.message.text}»`
        fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: notifId, text: notifText }),
        }).catch((err) => logError(businessId, 'Telegram notification send error:', err))
      }

      // Save assistant message
      const { error: assistMsgError } = await supabase.from('messages').insert({
        business_id: business.id,
        client_id: client.id,
        role: 'assistant',
        content: reply,
        tokens_used: result.tokensUsed,
      })
      if (assistMsgError) {
        logError(businessId, 'DB error saving assistant message:', assistMsgError)
      }

      // Increment usage counter
      if (subscription) {
        const { error: subUpdateError } = await supabase
          .from('subscriptions')
          .update({ messages_used: subscription.messages_used + 1 })
          .eq('id', subscription.id)
        if (subUpdateError) {
          logError(businessId, 'DB error updating messages_used:', subUpdateError)
        }
      }
    } catch (err) {
      logError(businessId, `AI processing error (client=${client.id}):`, err)
      reply = 'Произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.'
    }

    // Step 9: Send reply to user
    try {
      await ctx.reply(reply)
    } catch (err) {
      logError(businessId, 'Telegram send reply error:', err)
    }
  })

  // ── C1: /mybookings command + "мои записи" text ──────────────────────────

  async function handleMyBookings(ctx: Context) {
    const telegramUserId = ctx.from?.id
    if (!telegramUserId) return

    const supabase = await createServiceClient()

    // Look up client by telegram_user_id + business_id
    const { data: client } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('business_id', businessId)
      .eq('telegram_user_id', telegramUserId)
      .single<{ id: string; first_name: string | null; last_name: string | null }>()

    if (!client) {
      await ctx.reply('У вас нет предстоящих записей.')
      return
    }

    // Load next 5 upcoming bookings with service name
    const { data: rows, error } = await supabase
      .from('bookings')
      .select('id, scheduled_at, status, services(name)')
      .eq('business_id', businessId)
      .eq('client_id', client.id)
      .in('status', ['confirmed', 'pending'])
      .gt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5)

    if (error) {
      logError(businessId, 'DB error loading mybookings:', error)
      await ctx.reply('Произошла ошибка. Попробуйте позже.')
      return
    }

    if (!rows || rows.length === 0) {
      userBookingsCache.delete(telegramUserId)
      await ctx.reply('У вас нет предстоящих записей.')
      return
    }

    // Map to BookingRow
    const bookings: BookingRow[] = rows.map((r) => {
      const svc = Array.isArray(r.services) ? r.services[0] : r.services
      return {
        id: r.id as string,
        scheduled_at: r.scheduled_at as string,
        status: r.status as string,
        service_name: (svc as { name?: string } | null)?.name ?? null,
      }
    })

    // Save to cache
    userBookingsCache.set(telegramUserId, bookings)

    // Format response
    const lines = bookings.map((b, i) => {
      const dt = new Date(b.scheduled_at).toLocaleString('ru-RU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
      const statusLabel = b.status === 'confirmed' ? 'подтверждено' : 'ожидает'
      const svcPart = b.service_name ? ` — ${b.service_name}` : ''
      return `${i + 1}. ${dt}${svcPart} (${statusLabel})`
    })

    const text =
      'Ваши предстоящие записи:\n' +
      lines.join('\n') +
      "\n\nЧтобы отменить — напишите 'отменить 1' или 'отменить запись'"

    await ctx.reply(text)
  }

  bot.command('mybookings', handleMyBookings)
  bot.hears(/мои записи/i, handleMyBookings)

  // ── C2: Cancellation handler ──────────────────────────────────────────────

  bot.hears(/отменит[ьь]?\s*(\d+)?/i, async (ctx) => {
    const telegramUserId = ctx.from?.id
    if (!telegramUserId) return

    const supabase = await createServiceClient()

    // Look up client
    const { data: client } = await supabase
      .from('clients')
      .select('id, first_name, last_name')
      .eq('business_id', businessId)
      .eq('telegram_user_id', telegramUserId)
      .single<{ id: string; first_name: string | null; last_name: string | null }>()

    if (!client) {
      await ctx.reply('У вас нет предстоящих записей.')
      return
    }

    // Load bookings from cache or DB
    let bookings = userBookingsCache.get(telegramUserId)

    if (!bookings) {
      const { data: rows, error } = await supabase
        .from('bookings')
        .select('id, scheduled_at, status, services(name)')
        .eq('business_id', businessId)
        .eq('client_id', client.id)
        .in('status', ['confirmed', 'pending'])
        .gt('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5)

      if (error) {
        logError(businessId, 'DB error loading bookings for cancellation:', error)
        await ctx.reply('Произошла ошибка. Попробуйте позже.')
        return
      }

      if (!rows || rows.length === 0) {
        await ctx.reply('У вас нет предстоящих записей.')
        return
      }

      bookings = rows.map((r) => {
        const svc = Array.isArray(r.services) ? r.services[0] : r.services
        return {
          id: r.id as string,
          scheduled_at: r.scheduled_at as string,
          status: r.status as string,
          service_name: (svc as { name?: string } | null)?.name ?? null,
        }
      })
      userBookingsCache.set(telegramUserId, bookings)
    }

    if (bookings.length === 0) {
      await ctx.reply('У вас нет предстоящих записей.')
      return
    }

    // Determine which booking to cancel
    const matchText = ctx.message?.text ?? ''
    const numMatch = matchText.match(/отменит[ьь]?\s*(\d+)/i)
    const indexStr = numMatch ? numMatch[1] : null
    const index = indexStr ? parseInt(indexStr, 10) - 1 : null

    let bookingToCancel: BookingRow | null = null

    if (bookings.length === 1) {
      // Only one booking — cancel immediately
      bookingToCancel = bookings[0]
    } else if (index !== null && index >= 0 && index < bookings.length) {
      // Number specified and valid
      bookingToCancel = bookings[index]
    } else {
      // Multiple bookings, no valid number — show list and ask
      const lines = bookings.map((b, i) => {
        const dt = new Date(b.scheduled_at).toLocaleString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
        const svcPart = b.service_name ? ` — ${b.service_name}` : ''
        return `${i + 1}. ${dt}${svcPart}`
      })
      await ctx.reply(
        'Какую запись отменить?\n' +
          lines.join('\n') +
          "\n\nНапишите 'отменить 1', 'отменить 2' и т.д."
      )
      return
    }

    // Cancel the booking (security: only own bookings via client_id check)
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingToCancel.id)
      .eq('client_id', client.id)

    if (cancelError) {
      logError(businessId, 'DB error cancelling booking:', cancelError)
      await ctx.reply('Произошла ошибка при отмене. Попробуйте позже.')
      return
    }

    // Remove from cache
    userBookingsCache.delete(telegramUserId)

    // Notify business owner
    const { data: business } = await supabase
      .from('businesses')
      .select('settings, telegram_bot_token')
      .eq('id', businessId)
      .single<{ settings: unknown; telegram_bot_token: string | null }>()

    if (business) {
      const notifId = (
        business.settings as { notification_telegram_id?: string | null } | null
      )?.notification_telegram_id

      if (notifId && notifId !== telegramUserId.toString()) {
        const clientDisplayName =
          [client.first_name, client.last_name].filter(Boolean).join(' ') ||
          (ctx.from?.username ? `@${ctx.from.username}` : 'Клиент')
        const dt = new Date(bookingToCancel.scheduled_at).toLocaleString('ru-RU', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
        const svcPart = bookingToCancel.service_name ?? 'услуга не указана'
        const notifText = `❌ ${clientDisplayName} отменил запись: ${svcPart} — ${dt}`

        fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: notifId, text: notifText }),
        }).catch((err) => logError(businessId, 'Telegram cancellation notification error:', err))
      }
    }

    await ctx.reply('Запись отменена. Будем рады видеть вас снова!')
  })

  bot.catch((err) => {
    logError(businessId, 'Unhandled bot framework error:', err)
  })
}
