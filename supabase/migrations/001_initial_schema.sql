-- ============================================================
-- hospoda.pro — initial schema
-- ============================================================

-- Hospody
create table if not exists pubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text,
  created_at  timestamptz not null default now()
);

-- Nápoje / ceník hospody
create table if not exists drinks (
  id          uuid primary key default gen_random_uuid(),
  pub_id      uuid not null references pubs(id) on delete cascade,
  name        text not null,
  price_small numeric(8,2),
  price_large numeric(8,2),
  created_at  timestamptz not null default now()
);

-- Sessions (jedno posezení v hospodě)
create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  pub_id      uuid not null references pubs(id) on delete cascade,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);

-- Uživatelé v session
create table if not exists session_users (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references sessions(id) on delete cascade,
  name         text not null,
  avatar_color text not null,
  created_at   timestamptz not null default now()
);

-- Záznamy vypitých nápojů
create table if not exists drink_logs (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references sessions(id) on delete cascade,
  session_user_id   uuid not null references session_users(id) on delete cascade,
  drink_id          uuid not null references drinks(id) on delete restrict,
  quantity          integer not null default 1 check (quantity > 0),
  unit_price        numeric(8,2) not null,
  logged_at         timestamptz not null default now()
);

-- ── Indexy pro časté dotazy ──────────────────────────────────
create index if not exists idx_drinks_pub_id
  on drinks(pub_id);

create index if not exists idx_sessions_pub_id
  on sessions(pub_id);

create index if not exists idx_sessions_open
  on sessions(pub_id) where closed_at is null;

create index if not exists idx_session_users_session_id
  on session_users(session_id);

create index if not exists idx_drink_logs_session_id
  on drink_logs(session_id);

create index if not exists idx_drink_logs_user_id
  on drink_logs(session_user_id);
