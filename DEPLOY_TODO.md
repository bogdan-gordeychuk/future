# DEPLOY_TODO — статус ручных действий

> Последнее обновление: 2026-03-01

---

## 🔴 БЛОКЕР ЗАПУСКА

### YooKassa верификация
- [ ] Загрузить документы самозанятого в личном кабинете YooKassa
- [ ] Дождаться подтверждения (1–3 рабочих дня)
- [ ] После верификации: проверить webhook URL в настройках YooKassa → `https://future-weld.vercel.app/api/billing/webhook`
- [ ] Протестировать full flow: `GET /api/billing/test-activate?secret=TEST_PAYMENT_SECRET` → убедиться что `subscription_status = active`
- [ ] Удалить `TEST_PAYMENT_SECRET` из Vercel env vars после верификации

---

## 🟢 Готово

### Vercel env vars — все настроены ✅

| Переменная | Статус |
|-----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `ANTHROPIC_API_KEY` | ✅ |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ |
| `BOT_TOKEN_ENCRYPTION_KEY` | ✅ |
| `CRON_SECRET` | ✅ |
| `NEXT_PUBLIC_APP_URL` | ✅ |
| `YOOKASSA_SHOP_ID` | ✅ (ждёт верификации) |
| `YOOKASSA_SECRET_KEY` | ✅ (ждёт верификации) |
| `PLATFORM_BOT_TOKEN` | ✅ |
| `PLATFORM_CHAT_ID` | ✅ |
| `UPSTASH_REDIS_REST_URL` | ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ |

### Функции ✅
- ✅ pg_cron `vika-monitor` — ежедневный дайджест Богдану в @vika_monitor_bot, 10:00 МСК
- ✅ pg_cron `vika-weekly-digest` — еженедельный дайджест каждому бизнесу по пн 10:00 МСК
- ✅ pg_cron `vika-reminders` — напоминания клиентам каждый час
- ✅ Redis rate limiter (Upstash) — env vars в Vercel, in-memory fallback
- ✅ ROI-виджет на дашборде — выручка за месяц через бота
- ✅ "Работает на VIKA.ai" — в /start каждого бота (виральность)
- ✅ 80% лимит — предупреждение владельцу в Telegram
- ✅ Пауза бота — Settings → чекбокс "Бот принимает сообщения"
- ✅ Лендинг синхронизирован с продуктом (аналитика, публичная страница, дайджест, отмена клиентом)
- ✅ Anthropic Soft Limit = $25 (email при >$25, hard cap $30)
