create table if not exists public.chukogame_price_history (
  game_jan text not null,
  observed_on date not null,
  lowest_purchase_price integer not null check (lowest_purchase_price >= 0),
  median_purchase_price numeric(12,2) not null check (median_purchase_price >= 0),
  highest_sale_price integer,
  eligible_seller_count integer not null check (eligible_seller_count >= 3),
  source_count integer not null check (source_count >= eligible_seller_count),
  created_at timestamptz not null default now(),
  primary key (game_jan, observed_on)
);

create index if not exists chukogame_price_history_jan_observed_on_idx
  on public.chukogame_price_history (game_jan, observed_on desc);

alter table public.chukogame_price_history enable row level security;
revoke all on table public.chukogame_price_history from anon, authenticated;
grant select, insert, update, delete on table public.chukogame_price_history to service_role;