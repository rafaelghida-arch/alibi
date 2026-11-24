-- ÁLIBI: casos gerados e assinaturas
create table if not exists public.cases (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  difficulty text not null,
  logic_type text not null,
  setting text not null,
  title text not null,
  data jsonb not null,           -- contém a solução: só o servidor (service role) lê
  created_at timestamptz not null default now()
);
create index if not exists cases_user_created on public.cases (user_id, created_at desc);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- RLS ligado e sem políticas: nenhum acesso pela chave anônima.
alter table public.cases enable row level security;
alter table public.subscriptions enable row level security;
