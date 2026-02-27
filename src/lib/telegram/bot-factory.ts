import { Bot } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { processMessage } from '@/lib/ai/engine'
import { checkRateLimit } from './rate-limiter'
import { decryptToken } from '@/lib/crypto'
import type { Business, Service, Master, KnowledgeItem, Client, Message } from '@/types/database'

// Cache bot instances: businessId → Bot
const botCache = new Map<string, Bot>()

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

export async function getOrCreateBot(plainToken: string, businessId: string): Promise<Bot> {
  if (botCache.has(businessId)) return botCache.get(businessId)!

  const bot = new Bot(plainToken)
  setupHandlers(bot, businessId, plainToken)
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

      const settings = business.settings as { welcome_message?: string }
      const welcome =
        settings?.welcome_message || `Привет! Я помощник ${business.name}. Чем могу помочь?`
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
      if (notifId) {
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
      if (notifId) {
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
        },
        ((history as Message[]) ?? []).reverse(),
        ctx.message.text,
        client.id
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
      if (notifId && (result.bookingCreated || result.intent === 'booking')) {
        const clientName =
          [client.first_name, client.last_name].filter(Boolean).join(' ') ||
          (ctx.from?.username ? `@${ctx.from.username}` : 'Клиент')
        const notifText = result.bookingCreated
          ? `📅 Новая заявка на запись!\n👤 ${clientName}\n💬 «${ctx.message.text}»\n\nОткройте панель для подтверждения.`
          : `💬 Клиент интересуется записью:\n👤 ${clientName}\n💬 «${ctx.message.text}»`
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

  bot.catch((err) => {
    logError(businessId, 'Unhandled bot framework error:', err)
  })
}
