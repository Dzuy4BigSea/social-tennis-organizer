-- Row-level security. Helpers are SECURITY DEFINER so they can read `roles`
-- without recursing through RLS on that same table.

alter table public.clubs               enable row level security;
alter table public.profiles            enable row level security;
alter table public.roles               enable row level security;
alter table public.people              enable row level security;
alter table public.events              enable row level security;
alter table public.event_participants  enable row level security;
alter table public.event_collaborators enable row level security;
alter table public.event_state         enable row level security;
alter table public.event_join_codes    enable row level security;

create or replace function public.has_club_role(p_club uuid, p_roles public.club_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.roles
    where user_id = auth.uid()
      and club_id = p_club
      and role = any (p_roles)
  );
$$;

create or replace function public.has_club_access(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.roles
    where user_id = auth.uid() and club_id = p_club
  );
$$;

create or replace function public.is_event_editor(p_event uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event and (
         e.owner_id = auth.uid()
      or public.has_club_role(e.club_id, array['head_pro']::public.club_role[])
      or exists (
           select 1 from public.event_collaborators c
           where c.event_id = e.id and c.profile_id = auth.uid()
         )
    )
  );
$$;

-- clubs: members read their club; only head_pro can update.
create policy clubs_read on public.clubs
  for select using (public.has_club_access(id));

create policy clubs_update on public.clubs
  for update using (public.has_club_role(id, array['head_pro']::public.club_role[]));

-- profiles: read your own + others in the same club; write only your own.
create policy profiles_read_self on public.profiles
  for select using (
    id = auth.uid()
    or (club_id is not null and public.has_club_access(club_id))
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

-- roles: members read roles in their own club; only head_pro can grant/revoke.
create policy roles_read on public.roles
  for select using (public.has_club_access(club_id));

create policy roles_write on public.roles
  for all
  using (public.has_club_role(club_id, array['head_pro']::public.club_role[]))
  with check (public.has_club_role(club_id, array['head_pro']::public.club_role[]));

-- people: club members read; pros and head_pros write.
create policy people_read on public.people
  for select using (public.has_club_access(club_id));

create policy people_write on public.people
  for all
  using (public.has_club_role(club_id, array['head_pro','pro']::public.club_role[]))
  with check (public.has_club_role(club_id, array['head_pro','pro']::public.club_role[]));

-- events: club members read; owner / collaborator / head_pro write.
create policy events_read on public.events
  for select using (public.has_club_access(club_id));

create policy events_insert on public.events
  for insert with check (
    owner_id = auth.uid()
    and public.has_club_role(club_id, array['head_pro','pro']::public.club_role[])
  );

create policy events_update on public.events
  for update using (public.is_event_editor(id));

create policy events_delete on public.events
  for delete using (
    owner_id = auth.uid()
    or public.has_club_role(club_id, array['head_pro']::public.club_role[])
  );

-- event children: read if club member; write if event editor.
create policy event_participants_read on public.event_participants
  for select using (
    exists (select 1 from public.events e
            where e.id = event_id and public.has_club_access(e.club_id))
  );
create policy event_participants_write on public.event_participants
  for all
  using (public.is_event_editor(event_id))
  with check (public.is_event_editor(event_id));

create policy event_collaborators_read on public.event_collaborators
  for select using (
    exists (select 1 from public.events e
            where e.id = event_id and public.has_club_access(e.club_id))
  );
-- Only the event owner or head_pro can grant collaborators (collaborators
-- themselves cannot escalate by adding more).
create policy event_collaborators_write on public.event_collaborators
  for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.owner_id = auth.uid()
             or public.has_club_role(e.club_id, array['head_pro']::public.club_role[]))
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.owner_id = auth.uid()
             or public.has_club_role(e.club_id, array['head_pro']::public.club_role[]))
    )
  );

create policy event_state_read on public.event_state
  for select using (
    exists (select 1 from public.events e
            where e.id = event_id and public.has_club_access(e.club_id))
  );
create policy event_state_write on public.event_state
  for all
  using (public.is_event_editor(event_id))
  with check (public.is_event_editor(event_id));

create policy event_join_codes_read on public.event_join_codes
  for select using (
    exists (select 1 from public.events e
            where e.id = event_id and public.has_club_access(e.club_id))
  );
create policy event_join_codes_write on public.event_join_codes
  for all
  using (public.is_event_editor(event_id))
  with check (public.is_event_editor(event_id));
