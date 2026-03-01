-- Еженедельный дайджест каждому бизнесу: каждый понедельник 10:00 МСК = 07:00 UTC
SELECT cron.schedule(
  'vika-weekly-digest',
  '0 7 * * 1',
  $$
  SELECT net.http_get(
    url := 'https://future-weld.vercel.app/api/cron/weekly-digest',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true))
  )
  $$
);
