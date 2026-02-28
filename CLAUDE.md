# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект: VIKA
AI-powered Telegram-ассистент для онлайн-записи клиентов в малом бизнесе (барбершопы, студии, репетиторы).
Бизнес вставляет токен бота → ВИКА отвечает клиентам в Telegram, записывает, напоминает.

**Репозиторий:** https://github.com/bogdan-gordeychuk/future
**Production:** https://future-weld.vercel.app
**Supabase:** https://cdhpswltdptbtgmrcaqs.supabase.co

## Роли
- **Богдан (CTO):** задаёт вектор, одобряет решения, не пишет код
- **Claude Code:** архитектура, точечные фиксы, MCP-задачи (применение миграций), обновление документов
- **Kilo Code Cloud Agent:** крупные спринты, пишет много кода. Делает force-push в main — всегда `git reset --hard origin/main` перед работой.

## Текущий статус (февраль 2026)
- **Спринты 1–7 завершены** — продукт готов к первым платящим клиентам
- **Единственный блокер:** верификация YooKassa (внешнее действие)
- Подробный статус: `STRATEGY.md`, план: `ROADMAP.md`

## Команды
```bash
npm run dev      # dev-сервер на localhost:3000
npm run build    # production сборка
npm run lint     # ESLint
```

## Стек
- **Next.js 15** App Router, TypeScript, Tailwind
- **Supabase** — PostgreSQL (БД + Auth + RLS + pg_cron)
- **Vercel** — хостинг, auto-deploy из main
- **GrammY** — Telegram Bot framework
- **Claude Haiku** (`claude-haiku-4-5-20251001`) — AI для клиентского бота
- **YooKassa** — платежи и подписки (код готов, shop не верифицирован)
- **Zod** — валидация форм

## Архитектура
```
src/
  app/
    (auth)/              # /login, /register — публичные
    (dashboard)/         # /dashboard, /services, /bookings... — защищены auth
      _components/       # mobile-nav, shared UI
      analytics/         # выручка, топ услуги/мастера, 7-дней
      billing/           # подписка, YooKassa
      bookings/          # список + управление статусами
      clients/           # список + детальная страница /[id]
      dashboard/         # главная с онбордингом и статистикой
      knowledge/         # FAQ для бота
      masters/           # CRUD + /[id]/time-off
      services/          # CRUD
      settings/          # токен бота, timezone, рабочие часы, уведомления
    api/
      telegram/webhook/  # принимает апдейты от всех ботов (multi-tenant)
      billing/webhook/   # YooKassa события
      cron/reminders/    # напоминания (вызывается Supabase pg_cron каждые 15 мин)
  lib/
    supabase/
      client.ts          # браузерный клиент
      server.ts          # серверный клиент + serviceClient (bypass RLS)
    telegram/
      bot-factory.ts     # создание/кэш ботов, обработка сообщений, AI pipeline
      rate-limiter.ts    # 10 сообщений/мин per telegram_user_id (in-memory)
    ai/
      engine.ts          # вызов Claude, обработка tool_use
      prompts.ts         # system prompt с контекстом бизнеса
      client.ts          # Anthropic SDK клиент
    crypto.ts            # AES-256-CBC + per-token salt для шифрования токенов
    yookassa/            # клиент API, создание платежей
    actions/             # Server Actions (business, services, masters...)
  types/
    database.ts          # TypeScript типы всех таблиц Supabase
supabase/
  migrations/            # 001–005, применять через MCP (mcp__supabase__apply_migration)
```

## Мультиарендность
Каждый бизнес создаёт своего бота через @BotFather, вставляет токен в Settings.
Webhook регистрируется на `/api/telegram/webhook?id={businessId}`.
Роутинг: `businessId` из query param → находим бизнес в БД.

## Напоминания (cron)
**Supabase pg_cron** (`vika-reminders`, каждые 15 минут) → GET `/api/cron/reminders?secret=CRON_SECRET`.
Vercel Hobby поддерживает только 1 cron в день — pg_cron обходит это ограничение.

## Защита от затрат на AI
- `subscriptions.messages_limit` / `messages_used` — квота на месяц (SQL atomic increment)
- Rate limit: 10 сообщений/мин с одного `telegram_user_id` (in-memory)
- Лимит длины сообщения: 1000 символов
- Hard cap в Anthropic Console: $30/месяц

## БД (ключевые таблицы)
`businesses` → `services`, `masters`, `master_time_off`, `clients`, `bookings`, `messages`, `knowledge_items`, `subscriptions`
Все таблицы с RLS: владелец видит только своё.
Полная схема: `supabase/migrations/001_initial_schema.sql`

## Миграции
| Файл | Содержание |
|------|-----------|
| 001_initial_schema.sql | Базовая схема |
| 002_auto_create_public_user.sql | Триггер создания user при регистрации |
| 003_indexes_and_trial_subscription.sql | Индексы, auto-trial триггер, pg_cron |
| 004_sprint7.sql | preferred_name, master_time_off, bookings indexes |
| 005_atomic_increment.sql | increment_messages_used() SQL function |

## Git-конвенции
- `feat:` новая функциональность
- `fix:` баг
- `chore:` инфраструктура, зависимости
- `docs:` документация

## Что НЕ коммитить
- `.env.local` — секреты (в .gitignore)
- `.mcp.json` — GitHub/MCP токены (в .gitignore)

## Переменные окружения
Шаблон: `.env.example`. Заполненный: `.env.local` (не в git).
Ключевые: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_WEBHOOK_SECRET`,
`BOT_TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
