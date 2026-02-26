# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект: VIKA
AI-powered Telegram-ассистент для онлайн-записи клиентов в малом бизнесе (барбершопы, студии, репетиторы).
Бизнес записывает токен бота → ВИКА отвечает клиентам в Telegram, записывает, напоминает.

**Репозиторий:** https://github.com/bogdan-gordeychuk/future
**Supabase:** https://cdhpswltdptbtgmrcaqs.supabase.co

## Роли
- **Богдан (CTO):** задаёт вектор, одобряет решения, не пишет код
- **Claude (команда):** PM + архитектор + разработчик + QA. Работает автономно.

## Текущий статус (февраль 2026)
- Sprint 1 в процессе: Next.js 15 инициализирован, схема БД создана и применена в Supabase, репо запушено
- Sprint 2 следующий: ядро Telegram бота + AI движок
- Подробный роадмап: `memory/project-booking-saas.md`

## Команды
```bash
npm run dev      # dev-сервер на localhost:3000
npm run build    # production сборка
npm run lint     # ESLint
```

## Стек
- **Next.js 15** App Router, TypeScript, Tailwind
- **Supabase** — PostgreSQL (БД + Auth + RLS)
- **Vercel** — хостинг (не подключён ещё)
- **GrammY** — Telegram Bot framework (`grammy`)
- **Claude Haiku** (`claude-haiku-4-5-20251001`) — AI для клиентского бота (дёшево)
- **Claude Sonnet** — для сложных задач в админ-панели
- **YooKassa** — платежи и подписки (Sprint 4)
- **Zod** — валидация

## Архитектура
```
src/
  app/
    (auth)/          # /login, /register — публичные
    (dashboard)/     # /dashboard, /services, /bookings... — защищены middleware
    api/
      telegram/webhook/  # принимает апдейты от всех ботов (multi-tenant)
      billing/webhook/   # YooKassa события
  lib/
    supabase/
      client.ts      # браузерный клиент
      server.ts      # серверный клиент + serviceClient (bypass RLS)
    telegram/        # логика бота (Sprint 2)
    ai/              # AI движок, промпты, контекст (Sprint 2)
    yookassa/        # платежи (Sprint 4)
  types/
    database.ts      # TypeScript типы всех таблиц
  middleware.ts      # защита роутов через Supabase Auth
supabase/
  migrations/        # SQL миграции, применять через Supabase SQL Editor
```

## Мультиарендность
Каждый бизнес создаёт своего бота через @BotFather и вставляет токен в панель.
Мы регистрируем webhook на `/api/telegram/webhook`.
Роутинг: по `telegram_bot_token` находим `business_id` в БД.

## Защита от затрат на AI
- `subscriptions.messages_limit` и `messages_used` — квота на месяц
- Rate limit: 10 сообщений/мин с одного `telegram_user_id`
- После лимита — fallback без AI
- Hard cap в Anthropic Console: $30/месяц

## БД (ключевые таблицы)
`businesses` → `services`, `masters`, `clients`, `bookings`, `messages`, `knowledge_items`, `subscriptions`
Все таблицы с RLS: владелец видит только своё.
Полная схема: `supabase/migrations/001_initial_schema.sql`

## Git-конвенции
- `feat:` новая функциональность
- `fix:` баг
- `chore:` инфраструктура, зависимости
- `docs:` документация
- Каждый PR закрывает GitHub Issue: `closes #N`

## Что НЕ коммитить
- `.env.local` — секреты (в .gitignore)
- `.mcp.json` — GitHub токен (в .gitignore)

## Переменные окружения
Шаблон: `.env.example`. Заполненный: `.env.local` (не в git).
Ключевые: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_WEBHOOK_SECRET`
