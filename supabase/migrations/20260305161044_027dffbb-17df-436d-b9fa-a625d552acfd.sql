
SELECT cron.schedule(
  'email-worker-cron',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jefuidilwgzsnifjgdaf.supabase.co/functions/v1/email-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplZnVpZGlsd2d6c25pZmpnZGFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDUyMDksImV4cCI6MjA4NzA4MTIwOX0.rfL4TOmD2G5IRHXSysi0PVcIvidAqW83XJShkm2HaGg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
