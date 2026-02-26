import { Bot, Context } from 'grammy'
import { createServiceClient } from '@/lib/supabase/server'
import { processMessage } from '@/lib/ai/engine'
import { checkRateLimit } from './rate-limiter'
import type { Business, Service, Master, KnowledgeItem, Client, Message } from '@/types/database'

// Cache bot instances: token → Bot
const botCache = new Map<string, Bot>()

export interface BusinessBot {
  bot: Bot
  businessId: string
}

export async function getOrCreateBot(token: string): Promise<Bot> {
  if (botCache.has(token)) return botCache.get(token)!

  const bot = new Bot(token)
  setupHandlers(bot)
  botCache.set(token, bot)
  return bot
}

function setupHandlers(bot: Bot) {
  bot.command('start', async (ctx) => {
    const supabase = await createServiceClient()
    const telegramUserId = ctx.from?.id
    if (!telegramUserId) return

    // Find business by bot token
    const botToken = (ctx as Context & { api: { token: string } }).api.token
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('telegram_bot_token', botToken)
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
    const botToken = (ctx.api as unknown as { token: string }).token

    // Find business
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('telegram_bot_token', botToken)
      .single<Business>()

    if (!business) return

    // Check subscription limits
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
