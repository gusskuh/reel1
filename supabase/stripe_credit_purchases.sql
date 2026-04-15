-- Run once in Supabase → SQL Editor.
-- Idempotent credit grants from Stripe Checkout (webhook).

create table if not exists public.stripe_credit_purchases (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  credits_added integer not null check (credits_added > 0),
  created_at timestamptz not null default now()
);

alter table public.stripe_credit_purchases enable row level security;

-- No SELECT/INSERT policies: only service_role (server) should touch this table.

create or replace function public.fulfill_stripe_credit_purchase(
  p_session_id text,
  p_user_id uuid,
  p_credits int
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  if p_credits < 1 then
    raise exception 'invalid credits';
  end if;

  with ins as (
    insert into public.stripe_credit_purchases (checkout_session_id, user_id, credits_added)
    values (p_session_id, p_user_id, p_credits)
    on conflict (checkout_session_id) do nothing
    returning checkout_session_id
  )
  update public.profiles p
  set reel_credits = coalesce(p.reel_credits, 0) + p_credits
  where p.id = p_user_id
    and exists (select 1 from ins)
  returning p.reel_credits into new_balance;

  if new_balance is null then
    select p.reel_credits into new_balance from public.profiles p where p.id = p_user_id;
  end if;

  return coalesce(new_balance, 0);
end;
$$;

grant execute on function public.fulfill_stripe_credit_purchase(text, uuid, integer) to service_role;
