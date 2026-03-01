# VIKA — Мастер-план

> Последнее обновление: 2026-03-01
> Архитектор: Claude Sonnet 4.6
> CTO: Богдан (approves decisions)

---

## Текущее состояние (все спринты до Beta Done ✅)

| Модуль | Статус | Заметки |
|--------|--------|---------|
| Auth (login/register + consent) | ✅ | Supabase Auth + RLS + 152-ФЗ чекбокс |
| Dashboard (статистика) | ✅ | Параллельные запросы, счётчики |
| Services CRUD | ✅ | Fast: businessId из hidden field |
| Masters CRUD | ✅ | Включая time-off UI (`/masters/[id]/time-off`) |
| Knowledge base | ✅ | CRUD для FAQ бота |
| Settings | ✅ | Токен (AES-256), timezone, уведомления, webhook |
| Telegram webhook | ✅ | Multi-tenant routing по `?id=businessId` |
| AI engine (Claude Haiku) | ✅ | Разговоры, история, контекст бизнеса |
| AI создаёт записи (Path B) | ✅ | Tool Use `create_booking`, auto-confirm (`confirmed`) |
| Занятые слоты в AI-контексте | ✅ | 7 дней вперёд передаются в промпт |
| Bookings dashboard | ✅ | Фильтры, подтверждение/отмена/выполнение |
| TG уведомления при смене статуса | ✅ | Клиент получает сообщение |
| Уведомления владельцу о записях | ✅ | Когда бот создаёт заявку |
| Reminders (24h, 1h) | ✅ | Supabase pg_cron каждые 15 мин → /api/cron/reminders |
| Trial subscription auto-create | ✅ | Триггер + 400 msg лимит (migration 003) |
| Message limits (trial + paid) | ✅ | Правильные тексты при исчерпании |
| Billing + YooKassa | ⚠️ | Код готов, shop не верифицирован — единственный блокер |
| test-activate endpoint | ✅ | Заблокирован в production (NODE_ENV check → 404) |
| Toast notifications | ✅ | sonner |
| ConfirmModal (удаление) | ✅ | Кастомный модал |
| Landing page | ✅ | Pain-focused hero, "14 дней или 400 сообщений", FAQ, сравнение |
| /privacy page | ✅ | 152-ФЗ |
| DB indexes | ✅ | migration 003: services/masters/kb/messages |
| Детальные логи бота | ✅ | `[bot:BIZID]` + структура ошибки |
| Onboarding checklist на дашборде | ✅ | 5 шагов, исчезает когда всё готово |
| Smart /start с услугами | ✅ | Показывает список услуг с ценами |
| Webhook статус в настройках | ✅ | Зелёный/серый индикатор + @username |
| Рабочие часы в AI-промпте | ✅ | Бот не предлагает нерабочее время |
| Working hours UI | ✅ | Чекбоксы + time-пикеры в настройках, сохраняется в settings JSONB |
| **Страница клиентов** | ✅ | N+1 исправлен, message count по role='user' |
| **Реальные платежи YooKassa** | ❌ | Пока симуляция |
| **Dev/Prod окружения** | ❌ | Сейчас только prod |
| Vercel Analytics | ✅ | @vercel/analytics в layout.tsx |
| Атомарный increment messages_used | ✅ | SQL RPC, race condition исправлен |
| Ограничение длины сообщения | ✅ | 1000 символов, защита от token flooding |
| Мобильная адаптация дашборда | ✅ | Mobile header + bottom nav |
| Bot cache инвалидация | ✅ | При смене токена |
| **Admin bot mode** | ✅ | Владелец пишет боту → Claude Haiku: list_bookings, set_master_time_off, cancel_booking |
| **Публичная страница /b/[slug]** | ✅ | ISR, услуги, мастера, QR-код, CTA в Telegram |
| **businesses.slug** | ✅ | Auto-generated (12 hex chars UUID), migration 006 |
| **80% лимит предупреждение** | ✅ | Fire-and-forget в notifChatId, срабатывает 1 раз |
| **auto_reply_enabled пауза** | ✅ | Чекбокс в Settings, бот отвечает "приостановлено" |
| **Ближайшие записи на дашборде** | ✅ | 5 записей под stat-cards, ссылка на /bookings |
| **Мониторинг платформы /api/cron/monitor** | ✅ | Ежедневный Telegram-дайджест Богдану (07:00 UTC) |
| **Redis rate limiter (Upstash)** | ✅ | Async, in-memory fallback, env vars добавлены |

---

## Статус бота (ключевая логика)

```
Сообщение от клиента
  → rate limit (10/min, Redis или in-memory) → "Подождите"
  → fetch business
  → ЕСЛИ sender == notification_telegram_id → admin pipeline (Claude Haiku, 3 tools) → return
  → auto_reply_enabled == false → "Запись приостановлена..."
  → content guard (injection/jailbreak/exfiltration) → owner alert
  → trial истёк по дате → "Пробный период закончился..."
  → sub expired/cancelled → "Доступ приостановлен..."
  → trial/paid лимит сообщений исчерпан → соответствующий текст
  → upsert client → save user message
  → load context (services, masters, kb, history, booked slots)
  → Claude Haiku → tool_use create_booking или text reply
  → notify owner → save assistant message → increment messages_used
  → ЕСЛИ messages_used+1 == ceil(limit*0.8) → owner 80% warning (fire-and-forget)
```

---

## Beta-план (следующие шаги)

### Шаг 1 — Dev/Prod окружения (инфраструктура)

**Текущее состояние:** одна база (Supabase prod), один Vercel проект (prod).

**Цель:** безопасно тестировать изменения перед выкаткой.

**Минимальный вариант (Vercel branches):**
1. Создать ветку `dev` в git
2. Vercel автоматически создаёт preview-деплой для каждой ветки
3. Preview URL: `future-git-dev-bogdan.vercel.app` (или аналогичный)
4. Та же Supabase для MVP (разные user accounts для тестов)

**Полноценный вариант (отдельная Supabase):**
1. Создать второй Supabase проект (dev)
2. Добавить переменные окружения в Vercel: `NEXT_PUBLIC_SUPABASE_URL` для dev env
3. При PR → automatic preview deployment с dev БД

**Рекомендация:** начать с Vercel branches (минимум усилий), при первых реальных клиентах сделать отдельную Supabase для dev.

### Шаг 2 — YooKassa реальные платежи

**Что сделать:**
1. Верифицировать аккаунт в YooKassa (shop confirmed)
2. Проверить webhook URL `/api/billing/webhook` настроен в YooKassa
3. Протестировать full flow: оплата → webhook → `subscription_status=active`
4. Удалить `test-activate` endpoint перед публичным запуском

**Текущая проблема:** billing action падает без try/catch → теперь показывает ошибку вместо белого экрана. Причина: вероятно, shop не настроен в YooKassa test dashboard или credentials невалидны.

### Шаг 3 — Бета-пользователи (3–5 бизнесов)

**Порядок онбординга:**
1. Зарегистрироваться на future-weld.vercel.app
2. Создать бота через @BotFather → вставить токен в Настройки
3. Добавить услуги + мастеров
4. Добавить 2–3 FAQ в базу знаний
5. Настроить Telegram ID для уведомлений
6. Нажать "Подключить бот"
7. Написать своему боту в Telegram

**Критерий успеха:** клиент написал → создалась pending запись → владелец подтвердил → клиент получил уведомление.

---

## Беклог

### P0 — Единственный блокер запуска
- [ ] **Real YooKassa payments** — верифицировать shop, настроить webhook, добавить env vars в Vercel

### P1 — После первых клиентов
- [ ] **Мини-виджет подписки на дашборде** — показывать X/Y сообщений без перехода в /billing
- [x] **Последние 5 записей на дашборде** ✅ Sprint 10
- [ ] **Скриншот/GIF диалога на лендинге** — после первых клиентов, конверсия вырастет
- [ ] **Экспорт записей** — CSV для бухгалтерии
- [ ] **Skeleton screens** в loading.tsx для ключевых страниц

### P2 — Рост
- [ ] **Второй тариф** — 790 ₽ / 300 сообщений (для частных мастеров)
- [ ] **Онлайн-оплата клиентом через бота** — снижает no-show
- [x] **Публичная страница** — /b/[slug] с QR-кодом ✅ Sprint 9
- [ ] **Email/SMS напоминания** — резерв на случай проблем с Telegram
- [ ] **Годовой план** со скидкой 20%

### P3 — Масштабирование (при росте)
- [ ] Supabase Pro → PITR бэкапы (при 5+ платящих)
- [x] Redis (Upstash) distributed rate limiting ✅ Sprint 10 (env vars добавлены в Vercel)
- [ ] AI queue BullMQ (при 50+ клиентах)
- [ ] Уведомление РКН (перед PR-кампанией)

---

## Безопасность

### Хранение данных
- Telegram токены: AES-256-CBC + уникальный per-token random salt ✅
- Service Role Key: только в Vercel secrets, никогда в логах ✅
- Webhook: `x-telegram-bot-api-secret-token` верификация ✅
- YooKassa webhook: re-fetch платежа через API ✅
- Клиентские данные: TG ID, имя — персональные данные по 152-ФЗ, /privacy ✅

### Ограничения (MVP)
- Rate limiter: Upstash Redis (код готов) + in-memory fallback если env vars не заданы
- Supabase Free: 1 день retention бэкапов → Pro при 5+ платящих

### Бэкапы
- Supabase Free: ежедневные бэкапы, 1 день retention
- **При 5+ клиентах:** Supabase Pro ($25/мес) → 7-дневный PITR

---

## Метрики для апгрейда

| Порог | Действие |
|-------|----------|
| 5 платящих | Supabase Pro, PITR бэкапы |
| 20 клиентов | Upstash Redis (rate limiting) |
| 50 клиентов | BullMQ AI queue |
| 100 клиентов | ИП УСН, Yandex Cloud DB |
| 135 клиентов | Лимит самозанятого 2.4M/год |

---

## Backlog — далёкое будущее
- [ ] Telegram Mini App — визуальный выбор слота
- [ ] Google Calendar / Яндекс Календарь sync
- [ ] Повторяющиеся записи
- [ ] Акции и скидки
- [ ] White-label (бизнес на своём домене)
- [ ] Филиалы (parent_business_id — архитектура уже готова)
- [ ] Уведомление Роскомнадзора (перед PR-кампанией)

---

## Последние изменения (2026-03-01, post-Sprint 10)

| Изменение | Файл(ы) | Тип |
|-----------|---------|-----|
| ROI-виджет на дашборде бизнеса (выручка за месяц через бота) | `dashboard/page.tsx` | UX / retention |
| "Работает на VIKA.ai" в /start сообщении каждого бота | `bot-factory.ts` | Виральность / acquisition |
| Еженедельный дайджест каждому бизнесу по понедельникам 10:00 МСК | `api/cron/weekly-digest/route.ts`, `008_weekly_digest_cron.sql` | Retention |
| Лендинг синхронизирован: аналитика, публичная страница, отмена клиентом, дайджест | `page.tsx` | Консистентность |

## Последние изменения (2026-03-01, Sprint 10)

| Изменение | Файл(ы) | Тип |
|-----------|---------|-----|
| 80% лимит: предупреждение владельцу ровно 1 раз | `bot-factory.ts` | UX / мониторинг |
| auto_reply_enabled: чекбокс паузы бота в Settings | `bot-factory.ts`, `actions/business.ts`, `settings/_form.tsx`, `settings/page.tsx` | UX |
| Ближайшие 5 записей на дашборде | `dashboard/page.tsx` | UX |
| Мониторинг платформы: /api/cron/monitor + migration 007 | `api/cron/monitor/route.ts`, `007_platform_cron.sql` | Ops |
| Redis rate limiter (Upstash + in-memory fallback) | `rate-limiter.ts` | Надёжность |
| Зависимость @upstash/redis добавлена | `package.json` | Зависимости |
| PLATFORM_BOT_TOKEN, PLATFORM_CHAT_ID, UPSTASH_* в .env.example | `.env.example` | Конфигурация |

## Последние изменения (2026-03-01, Sprint 9)

| Изменение | Файл(ы) | Тип |
|-----------|---------|-----|
| Admin bot mode: владелец пишет своему боту, Claude Haiku обрабатывает 3 команды | `admin-handler.ts` + `bot-factory.ts` | Новая фича |
| `list_bookings(date)` — записи на дату в формате таблицы | `admin-handler.ts` | Новая фича |
| `set_master_time_off(name, from, to, reason?)` — выходные мастера из бота | `admin-handler.ts` | Новая фича |
| `cancel_booking(...)` — отмена записи + уведомление клиента | `admin-handler.ts` | Новая фича |
| Admin-трафик не тратит `messages_used` | `bot-factory.ts` | Продукт |
| Публичная страница `/b/[slug]` — ISR 1h, услуги, мастера, QR, CTA | `app/b/[slug]/page.tsx` | Новая фича |
| `businesses.slug` — auto-generated 12-hex chars, migration 006 | `006_business_slug.sql` | БД |
| Settings: секция "Публичная страница" с URL + кнопка копирования | `settings/_form.tsx` | UX |
| `Business` interface: добавлен `slug: string \| null` | `types/database.ts` | Типы |

## Последние изменения (2026-02-28, Sprint 8 fixes)

| Изменение | Файл(ы) | Тип |
|-----------|---------|-----|
| Напоминания: Supabase pg_cron каждые 15 мин (обход лимита Vercel Hobby 1/день) | `migrations/003` | Архитектура |
| Атомарный `increment_messages_used` через SQL RPC | `bot-factory.ts` + `005_atomic_increment.sql` | Критический баг |
| `test-activate` заблокирован в production (NODE_ENV check → 404) | `test-activate/route.ts` | Безопасность |
| Ограничение длины сообщения 1000 символов | `bot-factory.ts` | Безопасность |
| Per-token random salt в шифровании токенов (AES-256 + уникальный scrypt salt) | `crypto.ts` | Безопасность |
| Webhook idempotency: дедупликация по `telegram_update_id` | `webhook/route.ts` | Надёжность |
| Slot generation timezone bug исправлен | `bot-factory.ts` | Критический баг |
| Выбор мастера: для single-master auto, для multi-master — только по имени | `engine.ts` | Корректность |
| Добавлен `@vercel/analytics` | `package.json` + `layout.tsx` | Аналитика |
| Trial copy: "14 дней или 400 сообщений бесплатно" | `page.tsx` | UX |
| Hero лендинга: pain-focused copy | `page.tsx` | Конверсия |
| ISR для лендинга: `revalidate = 3600` | `page.tsx` | Производительность |
| Счётчик записей на дашборде: только `confirmed + completed` | `dashboard/page.tsx` | Корректность |
| N+1 исправлен в clients page | `clients/page.tsx` | Производительность |
| Analytics: SQL GROUP BY вместо JS-группировки | `analytics/page.tsx` | Производительность |
| Bot cache инвалидация при смене токена | `bot-factory.ts` + `business.ts` | Корректность |
| Мобильная навигация: mobile header + bottom nav | `layout.tsx` + `mobile-nav.tsx` | UX/Mobile |
| README.md, CLAUDE.md актуализированы | `README.md`, `CLAUDE.md` | Документация |
