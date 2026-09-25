-- Clockd migration: hourly rates can be entered as gross or net.
-- Run once in Supabase → SQL Editor. Safe to re-run.
alter table public.companies
  add column if not exists rate_type text not null default 'gross' check (rate_type in ('gross', 'net'));
alter table public.settings
  add column if not exists rate_type text not null default 'gross' check (rate_type in ('gross', 'net'));
