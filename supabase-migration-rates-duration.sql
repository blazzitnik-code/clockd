-- Clockd migration: per-company rate history, quick duration entries, PDO fix.
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- 1) Rate history: a company's gross hourly rate valid from a date onward.
create table if not exists public.company_rates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  gross_rate  numeric(8,2) not null check (gross_rate >= 0),
  valid_from  date not null,
  created_at  timestamptz not null default now(),
  unique (company_id, valid_from)
);
create index if not exists company_rates_company_idx on public.company_rates (company_id, valid_from);

alter table public.company_rates enable row level security;
drop policy if exists "own rates" on public.company_rates;
create policy "own rates" on public.company_rates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Existing hourly companies: current rate applies "from the start".
insert into public.company_rates (user_id, company_id, gross_rate, valid_from)
select user_id, id, gross_rate, date '2000-01-01'
from public.companies
where gross_rate is not null
on conflict (company_id, valid_from) do nothing;

-- 2) Quick entry: total minutes without start/end time.
alter table public.entries
  add column if not exists duration_minutes integer check (duration_minutes >= 0);

-- 3) Students don't pay the long-term-care (PDO) contribution.
alter table public.settings alter column pdo_pct set default 0;
update public.settings set pdo_pct = 0 where pdo_pct <> 0;
