-- Run in Supabase → SQL Editor (once per project).
-- Profiles + signup credits + RLS. Requires service role on the server for credit decrements.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  reel_credits integer not null default 3,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Optional: keep updated_at fresh
create or replace function public.set_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- New auth users get 3 reel credits (matches USER_SIGNUP_REEL_CREDITS in app).
create or replace function public.handle_new_user_profile()
returns trigger as $$
begin
  insert into public.profiles (id, reel_credits)
  values (new.id, 3);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Existing accounts (created before this migration) get a profile + 3 credits.
insert into public.profiles (id, reel_credits)
select u.id, 3
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
