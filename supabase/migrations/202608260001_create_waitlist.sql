begin;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  waitlist_number bigint generated always as identity,
  email text not null,
  role text not null,
  referral_code text not null,
  referred_by uuid null references public.waitlist(id) on delete set null,
  referral_count integer not null default 0,
  created_at timestamptz not null default now(),

  constraint waitlist_number_unique unique (waitlist_number),
  constraint waitlist_email_unique unique (email),
  constraint waitlist_referral_code_unique unique (referral_code),
  constraint waitlist_email_normalized check (email = lower(btrim(email))),
  constraint waitlist_email_length check (char_length(email) between 3 and 320),
  constraint waitlist_role_valid check (
    role in ('developer', 'landlord', 'manager', 'agent', 'renter')
  ),
  constraint waitlist_referral_code_valid check (
    referral_code ~ '^AKR-[A-Z0-9]{10}$'
  ),
  constraint waitlist_referral_count_valid check (referral_count >= 0),
  constraint waitlist_not_self_referred check (referred_by is null or referred_by <> id)
);

create index if not exists waitlist_referred_by_idx
  on public.waitlist (referred_by)
  where referred_by is not null;

create index if not exists waitlist_priority_idx
  on public.waitlist (referral_count desc, created_at asc);

alter table public.waitlist enable row level security;

-- The browser never accesses this table directly. The Edge Function uses the
-- server-side service role, while anonymous and authenticated clients receive
-- no table privileges.
revoke all on table public.waitlist from anon, authenticated;
revoke all on sequence public.waitlist_waitlist_number_seq from anon, authenticated;

create or replace function public.increment_waitlist_referral_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.referred_by is not null then
    update public.waitlist
    set referral_count = referral_count + 1
    where id = new.referred_by;
  end if;

  return new;
end;
$$;

revoke all on function public.increment_waitlist_referral_count() from public;

drop trigger if exists waitlist_increment_referral_count on public.waitlist;
create trigger waitlist_increment_referral_count
after insert on public.waitlist
for each row
when (new.referred_by is not null)
execute function public.increment_waitlist_referral_count();

-- This view gives management the real referral-adjusted launch priority.
create or replace view public.waitlist_priority
with (security_invoker = true)
as
select
  id,
  waitlist_number,
  email,
  role,
  referral_code,
  referred_by,
  referral_count,
  created_at,
  rank() over (
    order by referral_count desc, created_at asc
  ) as priority_rank
from public.waitlist;

revoke all on table public.waitlist_priority from anon, authenticated;

commit;
