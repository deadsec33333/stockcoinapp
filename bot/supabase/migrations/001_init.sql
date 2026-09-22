-- Core tables for the X-post-to-coin launcher

create table if not exists stocks (
  symbol        text primary key,          -- e.g. AAPL (what users type after #)
  xstock_symbol text not null,             -- e.g. AAPLx
  name          text not null,
  mint          text not null,             -- Solana mint of the tokenized stock
  enabled       boolean not null default true
);

create table if not exists creators (
  x_user_id     text primary key,
  x_handle      text not null,
  avatar_url    text,
  first_seen_at timestamptz not null default now()
);

create type launch_status as enum ('queued','launching','live','failed','rejected');

create table if not exists launches (
  id            bigint generated always as identity primary key,
  tweet_id      text unique not null,       -- dedupe: one launch per post
  x_user_id     text not null references creators(x_user_id),
  ticker        text not null,              -- coin ticker, e.g. MOON
  coin_name     text not null,
  stock_symbol  text not null references stocks(symbol),
  image_url     text,
  metadata_uri  text,
  mint          text unique,                -- pump.fun coin mint once live
  tx_signature  text,
  status        launch_status not null default 'queued',
  error         text,
  created_at    timestamptz not null default now(),
  live_at       timestamptz
);
create index if not exists launches_live_idx on launches (status, live_at desc);
create index if not exists launches_stock_idx on launches (stock_symbol);

-- Creator fee claims and holder payouts
create table if not exists fee_claims (
  id            bigint generated always as identity primary key,
  tx_signature  text,
  claimed_sol   numeric not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists payouts (
  id            bigint generated always as identity primary key,
  launch_id     bigint not null references launches(id),
  holder        text not null,
  amount_sol    numeric not null,
  tx_signature  text,
  status        text not null default 'planned',   -- planned | sent | failed
  created_at    timestamptz not null default now()
);

-- Bot cursor so we never read the same mention twice
create table if not exists bot_state (
  key   text primary key,
  value text not null
);

-- ===== Public views for the frontend =====
create or replace view public_launches as
  select l.id, l.ticker, l.coin_name, l.image_url, l.mint, l.tx_signature, l.live_at,
         l.tweet_id, c.x_handle, c.avatar_url,
         s.symbol as stock_symbol, s.xstock_symbol, s.name as stock_name, s.mint as stock_mint
  from launches l
  join creators c using (x_user_id)
  join stocks s on s.symbol = l.stock_symbol
  where l.status = 'live';

create or replace view public_stats as
  select
    (select count(*) from launches where status = 'live')                        as tokens_launched,
    (select count(distinct x_user_id) from launches where status = 'live')       as creators,
    (select count(distinct stock_symbol) from launches where status = 'live')    as pairs_used,
    (select coalesce(sum(amount_sol),0) from payouts where status = 'sent')      as sol_paid_to_holders;

create or replace view public_pair_stats as
  select s.symbol, s.xstock_symbol, s.name, count(l.id) as launches
  from stocks s left join launches l on l.stock_symbol = s.symbol and l.status = 'live'
  where s.enabled
  group by s.symbol, s.xstock_symbol, s.name
  order by launches desc;

-- ===== Row level security: frontend (anon key) can only read the views =====
alter table stocks     enable row level security;
alter table creators   enable row level security;
alter table launches   enable row level security;
alter table fee_claims enable row level security;
alter table payouts    enable row level security;
alter table bot_state  enable row level security;

create policy "public read stocks" on stocks for select to anon using (enabled);
create policy "public read creators" on creators for select to anon using (true);
create policy "public read live launches" on launches for select to anon using (status = 'live');
create policy "public read sent payouts" on payouts for select to anon using (status = 'sent');
-- no policies on fee_claims / bot_state = invisible to the public
