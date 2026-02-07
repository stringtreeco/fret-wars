-- Fret Wars: public score submissions + leaderboards (Supabase Postgres)

create extension if not exists pgcrypto;

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Display
  display_name text not null default 'Anonymous',

  -- Score + run context
  score integer not null check (score >= 0),
  run_seed text,
  day integer not null check (day >= 1),
  total_days integer not null check (total_days >= 1),
  completed boolean not null default false,
  eligible boolean not null default false,

  -- Optional summary metrics (helpful for debugging / future leaderboards)
  cash integer,
  reputation integer,
  inventory_slots_used integer,
  inventory_capacity integer,
  best_flip_name text,
  best_flip_profit integer,
  rarest_sold_name text,
  rarest_sold_rarity text,

  -- Optional lead capture (only when user opts-in)
  email text,
  email_opt_in boolean not null default false,
  opt_in_at timestamptz,

  -- Client
  client_version text
);

create index if not exists scores_eligible_score_desc
  on public.scores (eligible, score desc, created_at desc);

create index if not exists scores_eligible_created_at_desc
  on public.scores (eligible, created_at desc);

create index if not exists scores_created_at_desc
  on public.scores (created_at desc);

