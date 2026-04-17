-- Přidání updated_at sloupce pokud neexistuje
alter table profiles add column if not exists updated_at timestamptz default now();

-- Přidání CHECK constraints (PostgreSQL neumí IF NOT EXISTS pro constraints, použijeme DO block)
do $$
begin
  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'profiles_subscription_status_check'
  ) then
    alter table profiles
      add constraint profiles_subscription_status_check
      check (subscription_status in ('free', 'active', 'trialing', 'past_due', 'canceled', 'unpaid'));
  end if;

  if not exists (
    select 1 from information_schema.check_constraints
    where constraint_name = 'profiles_subscription_tier_check'
  ) then
    alter table profiles
      add constraint profiles_subscription_tier_check
      check (subscription_tier in ('free', 'monthly', 'yearly'));
  end if;
end $$;

-- Oprav UPDATE policy aby měla WITH CHECK
drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Odstraň inertní service role policy pokud existuje
drop policy if exists "service role full access" on profiles;
