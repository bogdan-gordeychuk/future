# VIKA — Мастер-план

> Последнее обновление: 2026-02-28
> Архитектор: Claude Sonnet 4.6
> CTO: Богдан (approves decisions)

---

## Текущее состояние (все спринты до Beta Done ✅)

| Модуль | Статус | Заметки |
|--------|--------|---------|
| Auth (login/register + consent) | ✅ | Supabase Auth + RLS + 152-ФЗ чекбокс |
| Dashboard (статистика) | ✅ | Параллельные запросы, счётчики |
| Services CRUD | ✅ | Fast: businessId из hidden field |
| Masters CRUD | ✅ | Без рабочих часов (DB есть, UI нет) |
| Knowledge base | ✅ | CRUD для FAQ бота |
| Settings | ✅ | Токен (AES-256), timezone, уведомления, webhook |
| Telegram webhook | ✅ | Multi-tenant routing по `?id=businessId` |
| AI engine (Claude Haiku) | ✅ | Разговоры, история, контекст бизнеса |
| AI создаёт записи (Path B) | ✅ | Tool Use `create_booking`, `pending` статус |
| Занятые слоты в AI-контексте | ✅ | 7 дней вперёд передаются в промпт |
| Bookings dashboard | ✅ | Фильтры, подтверждение/отмена/выполнение |
| TG уведомления при смене статуса | ✅ | Клиент получает сообщение |
| Уведомления владельцу о записях | ✅ | Когда бот создаёт заявку |
| Reminders (24h, 1h) | ✅ | Supabase pg_cron → /api/cron/reminders |
| Trial subscription auto-create | ✅ | Триггер + 400 msg лимит (migration 003) |
| Message limits (trial + paid) | ✅ | Правильные тексты при исчерпании |
| Billing + YooKassa | ✅ | Симуляция, ошибки отображаются корректно |
| test-activate endpoint | ✅ | Для тестирования без YooKassa |
| Toast notifications | ✅ | sonner |
| ConfirmModal (удаление) | ✅ | Кастомный модал |
| Landing page | ✅ | FAQ из 10 вопросов, цены, сравнение |
| /privacy page | ✅ | 152-ФЗ |
| DB indexes | ✅ | migration 003: services/masters/kb/messages |
| Детальные логи бота | ✅ | `[bot:BIZID]` + структура ошибки |
| Onboarding checklist на дашборде | ✅ | 5 шагов, исчезает когда всё готово |
| Smart /start с услугами | ✅ | Показывает список услуг с ценами |
| Webhook статус в настройках | ✅ | Зелёный/серый индикатор + @username |
| Рабочие часы в AI-промпте | ✅ | Бот не предлагает нерабочее время |
| **Working hours UI** | ❌ | DB есть, промпт учитывает, UI формы нет |
| **Страница клиентов** | ❌ | — |
| **Реальные платежи YooKassa** | ❌ | Пока симуляция |
| **Dev/Prod окружения** | ❌ | Сейчас только prod |

---

## Статус бота (ключевая логика)

```
Сообщение от клиента
  → rate limit (10/min) → "Подождите"
  → trial истёк по дате → "Пробный период закончился..."
  → sub expired/cancelled → "Доступ приостановлен..."
  → trial/paid лимит сообщений исчерпан → соответствующий текст
  → upsert client → save user message
  → load context (services, masters, kb, history, booked slots)
  → Claude Haiku → tool_use create_booking или text reply
  → notify owner → save assistant message → increment messages_used
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

## Следующие фичи по запросу пользователей

### Приоритет 1 (сразу после первых пользователей)
- [ ] Working hours UI — форма выбора дней/часов в настройках (DB + промпт уже готовы)
- [ ] Страница клиентов (список + история)
- [ ] Real YooKassa payments

### Приоритет 2 (при 5+ платящих)
- [ ] Supabase Pro → PITR бэкапы
- [ ] Договор-оферта на сайте
- [ ] Email-напоминания (альтернатива TG)

### Приоритет 3 (при 20+ платящих)
- [ ] Redis (Upstash) для distributed rate limiting
- [ ] AI queue (BullMQ) при 50+
- [ ] Аналитика (выручка, популярные услуги, конверсия)

---

## Безопасность

### Хранение данных
- Telegram токены ботов: AES-256-CBC, фиксированный salt — допустимо для MVP
- Service Role Key: только в Vercel secrets, никогда в логах
- Клиентские данные: TG ID, имя, username — персональные данные по 152-ФЗ

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

## Backlog (после роста)

- [ ] Telegram Mini App для клиентов (выбор слота визуально)
- [ ] Google Calendar / Яндекс Календарь sync
- [ ] Повторяющиеся записи
- [ ] Акции и скидки
- [ ] Аналитика по выручке и популярным услугам
- [ ] White-label (бизнес на своём домене)
- [ ] Уведомление Роскомнадзора (перед PR-кампанией)
