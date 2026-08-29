begin;

select plan(6);

select has_table(
  'public',
  'waitlist',
  'The waitlist table exists'
);

select has_view(
  'public',
  'waitlist_priority',
  'The referral-adjusted priority view exists'
);

insert into public.waitlist (email, role, referral_code)
values ('referrer@example.com', 'developer', 'AKR-AAAAAAAAAA');

insert into public.waitlist (email, role, referral_code, referred_by)
select
  'referred@example.com',
  'renter',
  'AKR-BBBBBBBBBB',
  id
from public.waitlist
where email = 'referrer@example.com';

select is(
  (
    select referral_count
    from public.waitlist
    where email = 'referrer@example.com'
  ),
  1,
  'A successful referred signup increments the referrer once'
);

select is(
  (
    select count(*)
    from public.waitlist
    where referred_by = (
      select id
      from public.waitlist
      where email = 'referrer@example.com'
    )
  ),
  1::bigint,
  'The referred subscriber is linked to the referrer'
);

select is(
  (
    select priority_rank
    from public.waitlist_priority
    where email = 'referrer@example.com'
  ),
  1::bigint,
  'The subscriber with a successful referral receives first priority'
);

select throws_ok(
  $$
    insert into public.waitlist (email, role, referral_code)
    values ('referrer@example.com', 'agent', 'AKR-CCCCCCCCCC')
  $$,
  '23505',
  'A duplicate email cannot create a second waitlist row'
);

select * from finish();

rollback;
