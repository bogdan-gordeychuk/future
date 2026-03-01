# TODO после Sprint 10 — что нужно сделать вручную

> Файл создан 2026-03-01. Обновляй статус по мере выполнения.

---

## 🔴 БЛОКЕР ЗАПУСКА

### YooKassa верификация
- [ ] Загрузить документы самозанятого в личном кабинете YooKassa
- [ ] Дождаться подтверждения (1–3 рабочих дня)
- [ ] После верификации: проверить webhook URL в настройках YooKassa → `https://future-weld.vercel.app/api/billing/webhook`
- [ ] Протестировать full flow: `GET /api/billing/test-activate?secret=TEST_PAYMENT_SECRET` → убедиться что `subscription_status = active`
- [ ] Удалить `TEST_PAYMENT_SECRET` из Vercel env vars после верификации

---

## 🟡 Sprint 10 — требуют ручных действий

### 1. Платформенный мониторинг (Telegram-дайджест тебе каждый день)

**Что нужно:**

**a) Создай/найди тестового бота:**
1. Напиши @BotFather → `/newbot` → придумай имя типа `VIKA Platform Monitor`
2. Скопируй токен → добавь в Vercel:
   - `PLATFORM_BOT_TOKEN` = `1234567890:AAH...`
3. Напиши `/start` этому боту — иначе Telegram вернёт "chat not found"

**b) Узнай свой числовой Telegram ID:**
1. Напиши @userinfobot в Telegram → он пришлёт `Your ID: 123456789`
2. Скопируй число → добавь в Vercel:
   - `PLATFORM_CHAT_ID` = `123456789`

**c) Установи cron secret в Supabase:**
1. Открой Supabase Dashboard → SQL Editor
2. Выполни (замени YOUR_CRON_SECRET на реальное значение из Vercel env vars):
   ```sql
   ALTER DATABASE postgres SET app.cron_secret = 'YOUR_CRON_SECRET';
   ```

**d) Проверь вручную:**
```
GET https://future-weld.vercel.app/api/cron/monitor?secret=ВАШ_CRON_SECRET
```
Должен прийти Telegram-дайджест. Дальше будет работать автоматически каждый день в 10:00 MSK.

---

### 2. Redis rate limiter (Upstash)

Сейчас rate limiter работает в памяти — это нормально для MVP. При 20+ клиентах начнут появляться дублирующиеся сообщения (разные Vercel instances = разный state). Код уже написан — нужно только создать базу.

**Когда делать:** при первых признаках проблем с дублями, или превентивно при 10+ бизнесах.

**Как:**
1. Открой [upstash.com](https://upstash.com) → Create Database
2. Region: **eu-west-1 (Ireland)** — ближайший к Supabase Frankfurt
3. Plan: **Free tier** (10k команд/день бесплатно)
4. Скопируй из деталей базы:
   - `UPSTASH_REDIS_REST_URL` → добавь в Vercel
   - `UPSTASH_REDIS_REST_TOKEN` → добавь в Vercel
5. Сделай новый деплой (Vercel подтянет переменные)
6. Проверь: rate limiter автоматически переключится на Redis (без изменений в коде)

---

### 3. Мониторинг трат Anthropic

#### Проверить текущие траты:
- [console.anthropic.com](https://console.anthropic.com) → **Usage** вкладка → текущий месяц

#### Email-уведомление при приближении к лимиту:
1. console.anthropic.com → **Settings → Limits**
2. Найди **Soft Limit** (email при достижении)
3. Поставь например `$25` — получишь письмо когда осталось $5 до хард-кэпа $30
4. Hard Limit уже стоит $30 — не трогай

#### Telegram-уведомление (автоматически):
Мониторинг-бот (Feature 4) уже это делает на основе токенов из нашей БД:
- При `>$20` → `⚠️ Приближаемся к лимиту $30`
- При `>$25` → `🔴 КРИТИЧНО: подними лимит`

**Ограничение:** это оценочный расчёт (tokens × $1.28/M) из нашей БД.
Реальные цифры смотри в Anthropic Console.

**Нет возможности** получить точные данные биллинга через API — Anthropic не предоставляет такой endpoint. Лучшее решение — soft email limit в Console + наш cron.

---

### 4. Vercel env vars — итоговый чеклист

Зайди в Vercel → Project → Settings → Environment Variables, убедись что все есть:

| Переменная | Статус |
|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ есть |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ есть |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ есть |
| `ANTHROPIC_API_KEY` | ✅ есть |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ есть |
| `BOT_TOKEN_ENCRYPTION_KEY` | ✅ есть |
| `CRON_SECRET` | ✅ есть |
| `NEXT_PUBLIC_APP_URL` | ✅ есть |
| `YOOKASSA_SHOP_ID` | ✅ есть (ждёт верификации) |
| `YOOKASSA_SECRET_KEY` | ✅ есть (ждёт верификации) |
| `PLATFORM_BOT_TOKEN` | ✅ есть |
| `PLATFORM_CHAT_ID` | ✅ есть |
| `UPSTASH_REDIS_REST_URL` | ✅ есть |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ есть |

---

## 🟢 Готово (не требует действий)

- ✅ 80% лимит — предупреждение автоматически уйдёт в Telegram при достижении
- ✅ Пауза бота — Settings → чекбокс "Бот принимает сообщения"
- ✅ Ближайшие записи — видны на дашборде
- ✅ pg_cron `vika-monitor` — работает, дайджест приходит в @vika_monitor_bot каждый день в 10:00 МСК
- ✅ Redis rate limiter — Upstash подключён (env vars в Vercel)
