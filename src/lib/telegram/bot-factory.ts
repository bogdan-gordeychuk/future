import { Bot } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { processMessage } from '@/lib/ai/engine'
import { checkRateLimit } from './rate-limiter'
import type { Business, Service, Master, KnowledgeItem, Client, Message } from '@/types/database'

// Cache bot instances: businessId → Bot
const botCache = new Map<string, Bot>()

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

    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single<Business>()

    if (!business) {
      await ctx.reply('Бот не настроен. Обратитесь к администратору.')
      return
    }

    const settings = business.settings as { welcome_message?: string }
    const welcome =
      settings?.welcome_message ||
      `Привет! Я помощник ${business.name}. Чем могу помочь?`

    await ctx.reply(welcome)
  })

  bot.on('message:text', async (ctx) => {
    const telegramUserId = ctx.from?.id
    if (!telegramUserId) return

    // Rate limit check
    if (!checkRateLimit(telegramUserId)) {
      await ctx.reply('Подождите немного — слишком много сообщений.')
      return
    }

    const supabase = await createServiceClient()

    // Find business
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single<Business>()

    if (!business) return

    // Check trial / subscription expiry
    const now = new Date()
    const trialExpired =
      business.subscription_status === 'trial' &&
      new Date(business.trial_ends_at) < now
    const subExpired =
      business.subscription_status === 'expired' ||
      business.subscription_status === 'cancelled'

    if (trialExpired || subExpired) {
      await ctx.reply(
        'Доступ к боту временно приостановлен. Пожалуйста, свяжитесь с владельцем.'
      )
      return
    }

    // Check subscription message limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .single()

    const limitExceeded =
      subscription &&
      subscription.messages_limit !== -1 &&
      subscription.messages_used >= subscription.messages_limit

    // Upsert client
    const { data: client } = await supabase
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

    if (!client) return

    // Save user message
    await supabase.from('messages').insert({
      business_id: business.id,
      client_id: client.id,
      role: 'user',
      content: ctx.message.text,
      tokens_used: 0,
    })

    let reply: string

    if (limitExceeded) {
      reply =
        'К сожалению, лимит сообщений на этот месяц исчерпан. Свяжитесь с нами напрямую.'
    } else {
      // Load context
      const [{ data: services }, { data: masters }, { data: knowledgeItems }, { data: history }] =
        await Promise.all([
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
        ])

      try {
        const result = await processMessage(
          {
            business,
            services: (services as Service[]) ?? [],
            masters: (masters as Master[]) ?? [],
            knowledgeItems: (knowledgeItems as KnowledgeItem[]) ?? [],
          },
          ((history as Message[]) ?? []).reverse(),
          ctx.message.text
        )

        reply = result.reply

        // Notify business owner when client wants to book
        const notifId = (business.settings as { notification_telegram_id?: string | null } | null)
          ?.notification_telegram_id
        if (result.intent === 'booking' && notifId) {
          const clientName =
            [client.first_name, client.last_name].filter(Boolean).join(' ') ||
            (ctx.from?.username ? `@${ctx.from.username}` : 'Клиент')
          fetch(`https://api.telegram.org/bot${plainToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: notifId,
              text: `📅 Новый запрос на запись!\n👤 ${clientName}\n💬 «${ctx.message.text}»`,
            }),
          }).catch(() => {})
        }

        // Save assistant message
        await supabase.from('messages').insert({
          business_id: business.id,
          client_id: client.id,
          role: 'assistant',
          content: reply,
          tokens_used: result.tokensUsed,
        })

        // Increment usage counter
        if (subscription) {
          await supabase
            .from('subscriptions')
            .update({ messages_used: subscription.messages_used + 1 })
            .eq('id', subscription.id)
        }
      } catch (err) {
        console.error('[bot-factory] AI error:', err)
        reply = 'Произошла ошибка. Попробуйте позже или свяжитесь с нами напрямую.'
      }
    }

    await ctx.reply(reply)
  })

  bot.catch((err) => {
    console.error('[bot-factory] Unhandled error:', err)
  })
}
