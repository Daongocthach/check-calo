-- Schedule the cleanup-anonymous-users Edge Function with pg_cron.
-- Before running:
-- 1. Deploy the Edge Function: supabase functions deploy cleanup-anonymous-users
-- 2. Set secret: supabase secrets set ANONYMOUS_CLEANUP_SECRET=...
-- 3. Replace YOUR_PROJECT_REF and YOUR_ANONYMOUS_CLEANUP_SECRET below.

-- Store secrets in Vault so the cron job does not hardcode them inline.
select vault.create_secret('https://aeyzouadpkyvkyhqsoty.supabase.co', 'project_url');
select vault.create_secret('5d7c4a91e8f24b7aa6c3f19d2e8b4c7f91a6d3e5b8c2f4a7d9e1c3b5f7a9d2c4', 'anonymous_cleanup_secret');

-- Optional: remove an existing job with the same name before re-creating it.
select cron.unschedule('cleanup-anonymous-users-daily')
where exists (
  select 1
  from cron.job
  where jobname = 'cleanup-anonymous-users-daily'
);

-- Run every day at 03:00 UTC.
select
  cron.schedule(
    'cleanup-anonymous-users-daily',
    '0 3 * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
          || '/functions/v1/cleanup-anonymous-users',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'anonymous_cleanup_secret'
          )
        ),
        body := '{"dryRun":false,"minAgeDays":7,"onlyTest":true}'::jsonb
      ) as request_id;
    $$
  );

-- Useful checks:
-- select * from cron.job;
-- select * from cron.job_run_details order by start_time desc limit 20;
