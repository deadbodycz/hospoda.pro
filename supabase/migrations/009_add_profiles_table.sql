create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  subscription_status text not null default 'free',
  subscription_tier text not null default 'free',
  subscription_ends_at timestamptz,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "service role full access"
  on profiles for all using (auth.role() = 'service_role');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
