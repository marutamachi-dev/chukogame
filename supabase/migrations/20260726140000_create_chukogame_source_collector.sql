create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;
create extension if not exists pgcrypto;

create schema if not exists private;

create table public.chukogame_source_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('rakuten')),
  chunk smallint not null check (chunk between 0 and 5),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  requested_title_count integer not null default 0 check (requested_title_count >= 0),
  verified_offer_count integer not null default 0 check (verified_offer_count >= 0),
  verified_title_count integer not null default 0 check (verified_title_count >= 0),
  zero_search_count integer not null default 0 check (zero_search_count >= 0),
  no_verified_match_count integer not null default 0 check (no_verified_match_count >= 0),
  error_summary text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index chukogame_source_refresh_runs_latest_idx
  on public.chukogame_source_refresh_runs (source, chunk, status, completed_at desc);

create table public.chukogame_source_refresh_results (
  refresh_run_id uuid not null references public.chukogame_source_refresh_runs (id) on delete cascade,
  game_id text not null,
  game_jan text not null check (game_jan ~ '^[0-9]{13}$'),
  status text not null check (status in ('verified', 'no-search-results', 'no-verified-match', 'failed')),
  verified_offer_count integer not null default 0 check (verified_offer_count >= 0),
  error_summary text,
  created_at timestamptz not null default now(),
  primary key (refresh_run_id, game_id)
);

create index chukogame_source_refresh_results_run_status_idx
  on public.chukogame_source_refresh_results (refresh_run_id, status);

create table public.chukogame_source_offers (
  source text not null check (source in ('rakuten')),
  game_id text not null,
  game_jan text not null check (game_jan ~ '^[0-9]{13}$'),
  listing_url text not null,
  title text not null,
  price_with_shipping integer not null check (price_with_shipping >= 0),
  observed_at timestamptz not null,
  refresh_run_id uuid not null references public.chukogame_source_refresh_runs (id),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source, game_jan, listing_url)
);

create index chukogame_source_offers_source_game_idx
  on public.chukogame_source_offers (source, game_jan, observed_at desc);

alter table public.chukogame_source_refresh_runs enable row level security;
alter table public.chukogame_source_refresh_results enable row level security;
alter table public.chukogame_source_offers enable row level security;

revoke all on table public.chukogame_source_refresh_runs from anon, authenticated;
revoke all on table public.chukogame_source_refresh_results from anon, authenticated;
revoke all on table public.chukogame_source_offers from anon, authenticated;
grant select, insert, update, delete on table public.chukogame_source_refresh_runs to service_role;
grant select, insert, update, delete on table public.chukogame_source_refresh_results to service_role;
grant select, insert, update, delete on table public.chukogame_source_offers to service_role;

create table private.chukogame_collector_auth (
  secret_hash text primary key,
  created_at timestamptz not null default now()
);

do $$
declare
  collector_secret text;
begin
  if not exists (select 1 from vault.secrets where name = 'chukogame_collector_secret') then
    collector_secret := encode(gen_random_bytes(32), 'hex');
    perform vault.create_secret(collector_secret, 'chukogame_collector_secret');
    insert into private.chukogame_collector_auth (secret_hash)
      values (crypt(collector_secret, gen_salt('bf')));
  end if;
end;
$$;

create or replace function public.chukogame_collector_request_authorized(candidate text)
returns boolean
language sql
security definer
set search_path = private, extensions, pg_temp
as $$
  select exists (
    select 1
    from private.chukogame_collector_auth
    where secret_hash = extensions.crypt(candidate, secret_hash)
  );
$$;

revoke all on function public.chukogame_collector_request_authorized(text) from public;
revoke execute on function public.chukogame_collector_request_authorized(text) from anon, authenticated;
grant execute on function public.chukogame_collector_request_authorized(text) to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname like 'chukogame-rakuten-chunk-%';

select cron.schedule(
  'chukogame-rakuten-chunk-0', '0 20 * * *',
  $$select net.http_post(
    url := 'https://ibsstozurckxibhnhquu.supabase.co/functions/v1/chukogame-rakuten-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'chukogame_collector_secret')),
    body := '{"chunk":0}'::jsonb,
    timeout_milliseconds := 300000
  );$$
);

select cron.schedule(
  'chukogame-rakuten-chunk-1', '10 20 * * *',
  $$select net.http_post(
    url := 'https://ibsstozurckxibhnhquu.supabase.co/functions/v1/chukogame-rakuten-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'chukogame_collector_secret')),
    body := '{"chunk":1}'::jsonb,
    timeout_milliseconds := 300000
  );$$
);

select cron.schedule(
  'chukogame-rakuten-chunk-2', '20 20 * * *',
  $$select net.http_post(
    url := 'https://ibsstozurckxibhnhquu.supabase.co/functions/v1/chukogame-rakuten-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'chukogame_collector_secret')),
    body := '{"chunk":2}'::jsonb,
    timeout_milliseconds := 300000
  );$$
);

select cron.schedule(
  'chukogame-rakuten-chunk-3', '30 20 * * *',
  $$select net.http_post(
    url := 'https://ibsstozurckxibhnhquu.supabase.co/functions/v1/chukogame-rakuten-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'chukogame_collector_secret')),
    body := '{"chunk":3}'::jsonb,
    timeout_milliseconds := 300000
  );$$
);

select cron.schedule(
  'chukogame-rakuten-chunk-4', '40 20 * * *',
  $$select net.http_post(
    url := 'https://ibsstozurckxibhnhquu.supabase.co/functions/v1/chukogame-rakuten-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'chukogame_collector_secret')),
    body := '{"chunk":4}'::jsonb,
    timeout_milliseconds := 300000
  );$$
);

select cron.schedule(
  'chukogame-rakuten-chunk-5', '50 20 * * *',
  $$select net.http_post(
    url := 'https://ibsstozurckxibhnhquu.supabase.co/functions/v1/chukogame-rakuten-refresh',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-collector-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'chukogame_collector_secret')),
    body := '{"chunk":5}'::jsonb,
    timeout_milliseconds := 300000
  );$$
);
