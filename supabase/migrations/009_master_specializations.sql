-- Migration 009: Master specializations
-- Adds level (job title) to masters
-- Adds master_services many-to-many: which services each master can perform

-- 1. Job title / level for master (free text, e.g. "Старший барбер", "Мастер по ногтям")
alter table public.masters add column if not exists level text;

-- 2. Junction table: master ↔ service
create table if not exists public.master_services (
  master_id uuid not null references public.masters(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (master_id, service_id)
);

alter table public.master_services enable row level security;

create policy "Owners can manage master_services"
  on public.master_services
  using (
    exists (
      select 1
      from public.masters m
      join public.businesses b on b.id = m.business_id
      where m.id = master_id
        and b.owner_id = auth.uid()
    )
  );

-- 3. Indexes for fast lookups
create index if not exists master_services_master_idx on public.master_services(master_id);
create index if not exists master_services_service_idx on public.master_services(service_id);
