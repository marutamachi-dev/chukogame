create table public.chukogame_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('search', 'search_miss', 'view')),
  query text check (char_length(query) between 1 and 120),
  game_jan text check (game_jan ~ '^[0-9]{13}$'),
  occurred_on date not null default current_date,
  created_at timestamptz not null default now(),
  check (
    (event_type = 'view' and game_jan is not null and query is null)
    or (event_type in ('search', 'search_miss') and query is not null and game_jan is null)
  )
);

create index chukogame_events_occurred_on_event_type_idx
  on public.chukogame_events (occurred_on, event_type);
create index chukogame_events_query_idx
  on public.chukogame_events (query) where query is not null;
create index chukogame_events_game_jan_idx
  on public.chukogame_events (game_jan) where game_jan is not null;

create table public.chukogame_catalog_state (
  game_jan text primary key check (game_jan ~ '^[0-9]{13}$'),
  listed_from date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chukogame_catalog_history (
  id bigint generated always as identity primary key,
  removed_jan text not null check (removed_jan ~ '^[0-9]{13}$'),
  added_jan text not null check (added_jan ~ '^[0-9]{13}$'),
  removed_score integer not null check (removed_score >= 0),
  added_score integer not null check (added_score >= 0),
  changed_at timestamptz not null default now(),
  check (removed_jan <> added_jan)
);

alter table public.chukogame_events enable row level security;
alter table public.chukogame_catalog_state enable row level security;
alter table public.chukogame_catalog_history enable row level security;

revoke all on public.chukogame_events from anon, authenticated;
revoke all on public.chukogame_catalog_state from anon, authenticated;
revoke all on public.chukogame_catalog_history from anon, authenticated;
grant insert on public.chukogame_events to anon;
grant usage, select on sequence public.chukogame_events_id_seq to anon;

create policy "public clients can record valid catalog demand events"
  on public.chukogame_events
  for insert
  to anon
  with check (
    (event_type = 'view' and game_jan is not null and query is null)
    or (event_type in ('search', 'search_miss') and query is not null and game_jan is null)
  );

create or replace function public.chukogame_demand_30d()
returns table (
  query text,
  game_jan text,
  search_count integer,
  miss_count integer,
  view_count integer,
  demand_score integer
)
language sql
security definer
set search_path = ''
as $$
  with recent as (
    select event_type, query, game_jan
    from public.chukogame_events
    where occurred_on >= current_date - 29
  ), search_demand as (
    select
      query,
      null::text as game_jan,
      count(*) filter (where event_type = 'search')::integer as search_count,
      count(*) filter (where event_type = 'search_miss')::integer as miss_count,
      0::integer as view_count
    from recent
    where event_type in ('search', 'search_miss')
    group by query
  ), view_demand as (
    select
      null::text as query,
      game_jan,
      0::integer as search_count,
      0::integer as miss_count,
      count(*)::integer as view_count
    from recent
    where event_type = 'view'
    group by game_jan
  )
  select
    query,
    game_jan,
    search_count,
    miss_count,
    view_count,
    (search_count + miss_count * 2 + view_count)::integer as demand_score
  from (
    select * from search_demand
    union all
    select * from view_demand
  ) demand
  order by demand_score desc, query nulls last, game_jan nulls last;
$$;

revoke all on function public.chukogame_demand_30d() from public;
revoke execute on function public.chukogame_demand_30d() from anon, authenticated;
grant execute on function public.chukogame_demand_30d() to service_role;
