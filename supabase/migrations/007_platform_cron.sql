-- Ежедневный мониторинг платформы 10:00 MSK = 07:00 UTC
-- Требует: pg_net extension, переменная app.cron_secret в PostgreSQL конфиге
-- Перед применением: установить секрет в DB:
--   ALTER DATABASE postgres SET app.cron_secret = 'your-cron-secret-here';
SELECT cron.schedule(
  'vika-monitor',
  '0 7 * * *',
  $$
  SELECT net.http_get(
    url := 'https://future-weld.vercel.app/api/cron/monitor',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true))
  )
  $$
);
