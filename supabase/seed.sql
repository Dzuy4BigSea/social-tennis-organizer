-- Bootstrap one club and elevate yourself to head_pro.
--
-- Run AFTER you have signed up at least once through the app's auth flow,
-- which will have created a row in auth.users (and via trigger, public.profiles).
--
-- 1. Replace the email below with the address you signed up with.
-- 2. Run this file: `supabase db execute --file supabase/seed.sql`
--    (or paste it into the Supabase SQL editor).

do $$
declare
  v_email text := 'REPLACE_ME@example.com';
  v_user  uuid;
  v_club  uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No auth user with email %; sign up first.', v_email;
  end if;

  insert into public.clubs (name)
  values ('My Club')
  returning id into v_club;

  update public.profiles set club_id = v_club where id = v_user;

  insert into public.roles (user_id, club_id, role)
  values (v_user, v_club, 'head_pro')
  on conflict do nothing;
end $$;
