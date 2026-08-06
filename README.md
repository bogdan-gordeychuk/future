# Галя — AI-ассистент записи через Telegram

SaaS-платформа для малого бизнеса: подключаете Telegram-бота, Галя отвечает клиентам, записывает и напоминает о визитах.

**Production:** https://future-weld.vercel.app

## Стек

- Next.js 15 App Router · TypeScript · Tailwind CSS
- Supabase (PostgreSQL + Auth + RLS + pg_cron)
- GrammY (Telegram Bot) · Claude Haiku (AI) · YooKassa (платежи)
- Vercel (хостинг)

## Разработка

```bash
npm install
cp .env.example .env.local   # заполнить переменные
npm run dev                   # http://localhost:3000
```

## Документация

- `CLAUDE.md` — архитектура, стек, конвенции (для AI-агентов)
- `STRATEGY.md` — аудит, текущее состояние, открытые задачи
- `ROADMAP.md` — план, беклог, метрики роста
- `ANALYSIS.md` — глубокий анализ рынка и продукта
