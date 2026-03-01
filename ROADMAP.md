# VIKA — Мастер-план

> Последнее обновление: 2026-03-02
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
| **Специализации мастеров** | ✅ | masters.level + master_services, engine validation, UI |
| **Перенос записи** | ✅ | Через бота (reschedule_booking tool) + через дашборд (modal) |
| **Статус no_show** | ✅ | Кнопка "Не пришёл" в /bookings для прошедших confirmed |
| **Массовая отмена мастера** | ✅ | "Отменить день" в /masters, уведомления клиентам |
| **Управление аккаунтом** | ✅ | Заморозка, удаление в /billing + анонимизация клиента |
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

---

### Спринт 11 — "Гибкий администратор" (в процессе, 2026-03-02)

**Цель:** Умные мастера. Перенос записи. Управление аккаунтом. Клиент без Telegram.

**Специализации мастеров [архитектурно важно]:**
- [x] Migration 009: `masters.level` (должность) + таблица `master_services` (many-to-many)
- [x] UI мастера: поле "Должность" + мультиселект услуг мастера
- [x] Actions: createMaster/updateMaster принимают level + service_ids
- [x] bot-factory.ts: загружать master_services в AI-контекст
- [x] prompts.ts: мастера с уровнем и специализацией в промпте
- [x] engine.ts: валидация — мастер не делает услугу → ошибка + предложить другого
- [x] Settings: `require_master_selection` вкл/выкл

**Booking lifecycle:**
- [x] Перенос записи через бота (reschedule_booking AI tool + клиентские записи в контексте)
- [x] Перенос записи через дашборд (RescheduleModal с datetime-local)
- [x] Уведомление клиенту при переносе владельцем
- [x] Статус `no_show` для записей (кнопка "Не пришёл" в /bookings)
- [x] Массовая отмена: мастер + дата → уведомления всем клиентам (кнопка в /masters)

**Управление аккаунтом (самообслуживание):**
- [x] Заморозка аккаунта: `subscription_status = 'frozen'`, бот отвечает "запись приостановлена", UI в /billing
- [x] Удаление аккаунта: Server Action (каскад + deleteWebhook у Telegram), confirm modal в /billing
- [x] Удаление данных клиента барбершопа: кнопка в /clients/[id], анонимизация

**UX:**
- [x] Табы в /bookings — клиентская фильтрация без round-trip (один DB-запрос при загрузке)

**Юридика:**
- [x] Раздел DPA: VIKA = обработчик, бизнес = оператор ПД (/offer)
- [x] Право на удаление и заморозку в /offer
- [x] Ответственность платформы за расписание (/offer)
- [x] /privacy: разделение ролей владельцы бизнеса / клиенты бизнеса

**Ещё в работе:**
- [ ] Lookahead расширить до 30 дней + ближайший свободный слот при "нет мест"
- [ ] Форма на /b/[slug]: имя, телефон, услуга, мастер, слот + consent чекбокс
- [ ] Ручная запись через дашборд
- [ ] Расширить /api/cron/monitor: новые рег. за сутки, сообщения, имена бизнесов

---

### Спринт 12 — "Мастера и рост"

**Цель:** Рабочие часы мастера. Waitlist. Несколько бизнесов.

**Мастера:**
- [ ] Рабочие часы на уровне мастера (пн-ср vs чт-сб, отдельно от бизнеса)
- [ ] Предупреждение при добавлении time-off если есть действующие записи в этот период

**Retention:**
- [ ] Waitlist: клиент встаёт в очередь при "нет слотов" → уведомление при отмене
- [ ] Post-visit: только предложение записаться снова ("Хотите записаться снова к Алёне?")

**Рост:**
- [ ] Несколько бизнесов под 1 аккаунтом (переключение в UI)
- [ ] Overage: предложение апгрейда при приближении к лимиту
- [ ] iCal-ссылка на записи мастера (для Google Calendar / Apple Calendar)

---

### Спринт 13 — "Масштаб и Сети"

- [ ] Таблица locations / филиалы (мастер на нескольких точках, ротация)
- [ ] Сетевой тариф + billing (когда YooKassa верифицирован)
- [ ] Telegram Mini App — визуальный выбор слота
- [ ] Реферальная программа
- [ ] Google Calendar export (OAuth → создаём события при записи)
- [ ] Webhook outbound (бизнес интегрируется сам куда хочет)

---

### P1 — Параллельно / по возможности
- [ ] **Мини-виджет подписки на дашборде** — X/Y сообщений без перехода в /billing
- [ ] **Скриншот/GIF диалога на лендинге** — после первых клиентов
- [ ] **Экспорт записей** — CSV для бухгалтерии
- [ ] **Skeleton screens** в loading.tsx
- [ ] **Годовой план** со скидкой 20%

> **Убрано из плана (не роль администратора):**
> - ~~Хранение отзывов~~ — бизнес собирает сам (2ГИС/Яндекс/Google)
> - ~~Post-visit запрос отзыва~~ — владелец настраивает в Knowledge Base если нужно
> - ~~Политика отмены в settings~~ — дело бизнеса, не платформы
> - ~~Онлайн-оплата клиентом через бота~~ — VIKA не транзакционная платформа

### P2 — Инфраструктура (после 5 платящих)
- [ ] Docker + GitHub Actions → Selectel/Timeweb Cloud (переезд с Vercel)
- [ ] Yandex Managed PostgreSQL (РФ-серверы, 152-ФЗ локализация)
- [ ] Supabase Pro → PITR бэкапы

### P3 — Масштабирование (при росте)
- [x] Redis (Upstash) distributed rate limiting ✅ Sprint 10
- [ ] AI queue BullMQ (при 50+ клиентах)
- [ ] White-label для агентств (от 9 990 ₽/мес)
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

## Миссия продукта

> **VIKA автоматизирует функцию администратора.**
> Принимает сообщения клиентов, записывает по свободным слотам, напоминает, уведомляет.
> Не лезет в ценообразование, политики отмен и деньги клиентов — это дело бизнеса.
> Данные бизнеса принадлежат бизнесу. VIKA — посредник, не платформа для управления бизнесом.

---

## Тарифная сетка (целевая)

| | Старт | Бизнес | Сеть |
|---|---|---|---|
| **Цена** | **790 ₽/мес** | **1 490 ₽/мес** | **2 990 ₽/мес** |
| Мастера | 1 | до 5 | безлимит |
| Сообщений/мес | 500 | 2 000 | 5 000 |
| Филиалы | 1 | 1 | до 5 |
| Аналитика | базовая | полная | полная |
| Лист ожидания | — | ✓ | ✓ |
| Post-visit retention | — | ✓ | ✓ |
| SMS-уведомления | — | 50 шт/мес | 200 шт/мес |
| Поддержка | Telegram | Приоритет | Выделенный |

**Дополнительно:**
- Overage: +199₽ за пакет 500 доп. сообщений
- Доп. филиал: +490₽/мес
- Годовой план: скидка 20%
- White-label (агентства): от 9 990₽/мес

## Юридическая архитектура

**Схема ответственности по 152-ФЗ:**
- **VIKA.ai** = Обработчик по поручению (не оператор) → не регистрируется в РКН за каждый бизнес
- **Бизнес (владелец)** = Оператор ПД своих клиентов → отвечает перед клиентами барбершопа
- Запросы клиентов барбершопа на удаление данных — к бизнесу, не к VIKA
- Аналог: amoCRM, Битрикс24, Yclients — стандартная SaaS DPA-схема

**Что прописать в /offer (Богдан делает вручную):**
1. DPA: VIKA = обработчик, бизнес = оператор ПД
2. Данные не передаются третьим лицам (кроме случаев по закону РФ)
3. Право на удаление аккаунта (через /billing, данные удаляются безвозвратно)
4. Право на заморозку (данные сохраняются, бот приостанавливается)
5. VIKA не несёт ответственности за отмены/переносы расписания бизнеса
6. Запросы клиентов барбершопа → к бизнесу как оператору ПД

**Что VIKA хранит (минимизация):**
- `preferred_name` — только имя клиента (не фамилия)
- `telegram_user_id` — технический идентификатор
- История сообщений + записи (без суммы оплаты — только прайс-лист)

**Управление аккаунтом (самообслуживание):**
- Заморозка: `subscription_status = 'frozen'`, бот отвечает "запись приостановлена", возобновление в 1 клик
- Удаление аккаунта: каскад (businesses → все данные), deleteWebhook у Telegram
- Удаление клиента барбершопа: анонимизация (имя → null, messages → удалить, bookings → client_id null)

## Backlog — далёкое будущее
- [ ] Google Calendar / Яндекс Календарь sync
- [ ] Повторяющиеся записи
- [ ] Акции и скидки
- [ ] White-label (бизнес на своём домене)
- [ ] Филиалы (parent_business_id — архитектура уже готова)
- [ ] Онлайн-оплата через бота (снижает no-show)

---

## Последние изменения (2026-03-02, Sprint 11)

| Изменение | Файл(ы) | Тип |
|-----------|---------|-----|
| Migration 009: masters.level + master_services table | `009_master_specializations.sql` | БД |
| Специализации мастеров: UI (должность + услуги), engine валидация, bot-factory | `masters/_form.tsx`, `engine.ts`, `bot-factory.ts` | Фича |
| reschedule_booking AI tool + клиентские записи в промпте | `engine.ts`, `prompts.ts`, `bot-factory.ts` | Фича |
| RescheduleModal в /bookings для владельца | `bookings/_client.tsx` | UX |
| Статус no_show: кнопка "Не пришёл" | `bookings/_client.tsx` | Фича |
| Массовая отмена мастера на дату + TG уведомления клиентам | `masters/_form.tsx`, `actions/bookings.ts` | Фича |
| Управление аккаунтом: заморозка / удаление / анонимизация клиента | `billing/_account-actions.tsx`, `actions/business.ts`, `clients/[id]/_anonymize.tsx` | Фича |
| Табы /bookings — клиентская фильтрация без round-trip | `bookings/page.tsx`, `bookings/_client.tsx` | Производительность |
| require_master_selection toggle в Settings | `settings/_form.tsx`, `settings/page.tsx` | Фича |
| /offer и /privacy: DPA-парадигма, права на заморозку/удаление | `offer/page.tsx`, `privacy/page.tsx` | Юридика |
| Лендинг: перенос записи, специализации мастеров, самообслуживание в FAQ | `page.tsx` | Консистентность |

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
