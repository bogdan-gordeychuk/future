-- VIKA: AI Booking Assistant SaaS
-- Initial schema migration

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- USERS (business owners, = Supabase Auth users)
-- ─────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  telegram_user_id bigint,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
create policy "Users can read/update own data" on public.users
  using (auth.uid() = id);

-- ─────────────────────────────────────────────
-- BUSINESSES (one owner can have multiple)
-- ─────────────────────────────────────────────
create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  phone text,
  address text,
  city text,
  -- Telegram bot credentials (token stored encrypted at app level)
  telegram_bot_token text,
  telegram_bot_username text,
  -- Business settings as JSONB for flexibility
  settings jsonb default '{
    "auto_reply_enabled": true,
    "welcome_message": "Привет! Я ВИКА, ваш виртуальный администратор. Чем могу помочь?",
    "escalation_keywords": ["человек", "оператор", "менеджер"],
    "working_hours": {
      "mon": {"start": "09:00", "end": "21:00", "enabled": true},
      "tue": {"start": "09:00", "end": "21:00", "enabled": true},
      "wed": {"start": "09:00", "end": "21:00", "enabled": true},
      "thu": {"start": "09:00", "end": "21:00", "enabled": true},
      "fri": {"start": "09:00", "end": "21:00", "enabled": true},
      "sat": {"start": "10:00", "end": "20:00", "enabled": true},
      "sun": {"start": "10:00", "end": "18:00", "enabled": false}
    }
  }'::jsonb,
  subscription_status text default 'trial' check (
    subscription_status in ('trial', 'active', 'cancelled', 'expired')
  ),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.businesses enable row level security;
create policy "Owners can manage own businesses" on public.businesses
  using (auth.uid() = owner_id);

-- ─────────────────────────────────────────────
-- SERVICES (what the business offers)
-- ─────────────────────────────────────────────
create table public.services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 60,
  price_kopecks int not null default 0, -- 150000 = 1500₽
  is_active bool default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.services enable row level security;
create policy "Owners can manage own services" on public.services
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- MASTERS (staff members)
-- ─────────────────────────────────────────────
create table public.masters (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  telegram_user_id bigint, -- for notifications
  is_active bool default true,
  created_at timestamptz default now()
);

alter table public.masters enable row level security;
create policy "Owners can manage own masters" on public.masters
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- WORKING HOURS (per master, per day template)
-- ─────────────────────────────────────────────
create table public.working_hours (
  id uuid primary key default uuid_generate_v4(),
  master_id uuid not null references public.masters(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Mon
  start_time time not null,
  end_time time not null,
  is_working bool default true,
  unique (master_id, day_of_week)
);

alter table public.working_hours enable row level security;
create policy "Owners can manage working hours" on public.working_hours
  using (
    exists (
      select 1 from public.masters m
      join public.businesses b on b.id = m.business_id
      where m.id = master_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- SCHEDULE OVERRIDES (days off, vacations)
-- ─────────────────────────────────────────────
create table public.schedule_overrides (
  id uuid primary key default uuid_generate_v4(),
  master_id uuid not null references public.masters(id) on delete cascade,
  date date not null,
  is_blocked bool default true,
  reason text,
  unique (master_id, date)
);

alter table public.schedule_overrides enable row level security;
create policy "Owners can manage schedule overrides" on public.schedule_overrides
  using (
    exists (
      select 1 from public.masters m
      join public.businesses b on b.id = m.business_id
      where m.id = master_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- CLIENTS (end-users, per business)
-- ─────────────────────────────────────────────
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  telegram_user_id bigint not null,
  telegram_username text,
  first_name text,
  last_name text,
  phone text,
  notes text, -- owner's notes about the client
  visit_count int default 0,
  last_visit_at timestamptz,
  created_at timestamptz default now(),
  unique (business_id, telegram_user_id)
);

alter table public.clients enable row level security;
create policy "Owners can manage own clients" on public.clients
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- BOOKINGS
-- ─────────────────────────────────────────────
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  master_id uuid references public.masters(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null,
  price_kopecks int not null default 0,
  status text default 'pending' check (
    status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')
  ),
  notes text,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings enable row level security;
create policy "Owners can manage own bookings" on public.bookings
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- MESSAGES (conversation history for AI context)
-- ─────────────────────────────────────────────
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  tokens_used int default 0,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;
create policy "Owners can read own messages" on public.messages
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- KNOWLEDGE ITEMS (business FAQ for AI)
-- ─────────────────────────────────────────────
create table public.knowledge_items (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  question text not null,
  answer text not null,
  is_active bool default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.knowledge_items enable row level security;
create policy "Owners can manage own knowledge items" on public.knowledge_items
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- SUBSCRIPTIONS
-- ─────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro')),
  status text not null default 'active' check (
    status in ('active', 'cancelled', 'past_due', 'expired')
  ),
  yookassa_subscription_id text,
  messages_limit int default 300, -- per month; -1 = unlimited
  messages_used int default 0,
  period_start timestamptz default now(),
  period_end timestamptz default (now() + interval '30 days'),
  price_kopecks int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;
create policy "Owners can read own subscription" on public.subscriptions
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
create index idx_businesses_owner on public.businesses(owner_id);
create index idx_businesses_bot_token on public.businesses(telegram_bot_token);
create index idx_clients_business_tg on public.clients(business_id, telegram_user_id);
create index idx_bookings_business on public.bookings(business_id);
create index idx_bookings_scheduled on public.bookings(scheduled_at);
create index idx_messages_business_client on public.messages(business_id, client_id);
create index idx_messages_created on public.messages(created_at);

-- ─────────────────────────────────────────────
-- FUNCTION: auto-update updated_at
-- ─────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger businesses_updated_at before update on public.businesses
  for each row execute function update_updated_at();
create trigger bookings_updated_at before update on public.bookings
  for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function update_updated_at();
