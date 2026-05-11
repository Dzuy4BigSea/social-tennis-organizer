-- Atomic first-time save for a new room code: inserts events,
-- event_join_codes, and event_state in a single transaction. Replaces
-- the three sequential inserts in src/lib/events.js saveEventByCode(),
-- which could leave an orphan events row if either of the follow-up
-- inserts failed (most realistically, the join-code unique constraint
-- losing a race against a parallel save with the same code).
--
-- SECURITY DEFINER so the function does the club lookup + role check
-- itself instead of relying on RLS visibility for `roles` from inside
-- the call. The explicit has_club_role check below is the moral
-- equivalent of the events_insert RLS policy.

create or replace function public.create_event_with_code(
  p_code         text,
  p_name         text,
  p_event_type   text,
  p_status       public.event_status,
  p_state        jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_club     uuid;
  v_event_id uuid;
begin
  if v_user is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  -- First club the caller belongs to. Mirrors getCurrentClubId() in
  -- the JS layer; fine for the current single-club setup, revisit when
  -- a user can belong to multiple clubs.
  select club_id
    into v_club
    from public.roles
   where user_id = v_user
   limit 1;

  if v_club is null then
    raise exception 'no club for user' using errcode = '42501';
  end if;

  -- Same gate as the events_insert RLS policy. Required here because
  -- SECURITY DEFINER bypasses RLS for the inserts below.
  if not public.has_club_role(v_club, array['head_pro','pro']::public.club_role[]) then
    raise exception 'insufficient role to create event' using errcode = '42501';
  end if;

  insert into public.events (club_id, owner_id, name, event_type, status)
       values (v_club, v_user, p_name, p_event_type, p_status)
    returning id
        into v_event_id;

  insert into public.event_join_codes (code, event_id, created_by)
       values (p_code, v_event_id, v_user);

  insert into public.event_state (event_id, state)
       values (v_event_id, p_state);

  return v_event_id;
end;
$$;

grant execute on function
  public.create_event_with_code(text, text, text, public.event_status, jsonb)
  to authenticated;
