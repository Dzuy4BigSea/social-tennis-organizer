-- Tennis Tournament Manager — Phase 1 schema
--
-- Apply once on a fresh Supabase project (paste into the SQL editor,
-- or run `supabase db push` if you adopt the CLI later). Do not edit
-- applied tables in place — write a new migration file alongside this
-- one.
--
-- Phase 1 scope: profiles, orgs, org_members, org_invites, events.
-- Event state is stored as a single jsonb blob (mirrors today's
-- in-app reducer state). A relational decomposition into players /
-- participants / matches lands in Phase 2.

-- Defer `language sql` function-body validation so helper functions
-- can reference tables defined later in this file. Cleared at end of
-- the session by Supabase; harmless either way.
set check_function_bodies = off;

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Which orgs a user belongs to. SECURITY DEFINER so RLS policies on
-- org_members can call this without infinite recursion.
create or replace function public.user_org_ids(uid uuid)
returns setof uuid
language sql security definer stable set search_path = public
as $$ select org_id from public.org_members where user_id = uid $$;

create or replace function public.is_org_owner(target_org uuid, uid uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org and user_id = uid and role = 'owner'
  );
$$;

create or replace function public.is_org_organizer(target_org uuid, uid uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.org_members
    where org_id = target_org and user_id = uid and role in ('owner', 'organizer')
  );
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ─── Profiles ────────────────────────────────────────────────────────────────
-- App-side mirror of auth.users. id matches auth.uid().

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles_read_any_authed" on public.profiles for select
  to authenticated using (true);
create policy "profiles_self_insert" on public.profiles for insert
  to authenticated with check (id = auth.uid());
create policy "profiles_self_update" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── Orgs (tenants) ──────────────────────────────────────────────────────────

create table public.orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.orgs enable row level security;

create policy "orgs_member_read" on public.orgs for select
  to authenticated
  using (id in (select * from public.user_org_ids(auth.uid())));

create policy "orgs_self_create" on public.orgs for insert
  to authenticated
  with check (created_by = auth.uid());

-- ─── Org members ─────────────────────────────────────────────────────────────

create type public.org_role as enum ('owner', 'organizer', 'player');

create table public.org_members (
  org_id uuid not null references public.orgs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'player',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
alter table public.org_members enable row level security;

create policy "org_members_same_org_read" on public.org_members for select
  to authenticated
  using (org_id in (select * from public.user_org_ids(auth.uid())));

create policy "org_members_owner_write" on public.org_members for all
  to authenticated
  using (public.is_org_owner(org_id, auth.uid()))
  with check (public.is_org_owner(org_id, auth.uid()));

-- Auto-add the creator as owner when an org is created.
create or replace function public.add_creator_as_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger orgs_add_owner
  after insert on public.orgs
  for each row execute function public.add_creator_as_owner();

-- ─── Org invites ─────────────────────────────────────────────────────────────
-- The invite secret IS the code. RLS allows any authenticated user to
-- read invites (so a user can preview which org they're about to join);
-- only the redeem_org_invite() function inserts membership.

create table public.org_invites (
  code text primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  role public.org_role not null default 'player',
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.org_invites enable row level security;

create policy "org_invites_read_any_authed" on public.org_invites for select
  to authenticated using (true);

create policy "org_invites_owner_write" on public.org_invites for all
  to authenticated
  using (public.is_org_owner(org_id, auth.uid()))
  with check (public.is_org_owner(org_id, auth.uid()));

create or replace function public.redeem_org_invite(invite_code text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare inv public.org_invites%rowtype;
begin
  select * into inv from public.org_invites where code = invite_code;
  if inv is null then raise exception 'invalid invite code'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'invite expired';
  end if;
  insert into public.org_members (org_id, user_id, role)
  values (inv.org_id, auth.uid(), inv.role)
  on conflict (org_id, user_id) do nothing;
  return inv.org_id;
end;
$$;

-- ─── Events ──────────────────────────────────────────────────────────────────

create type public.event_type as enum ('tournament', 'event', 'social', 'league');
create type public.event_status as enum ('draft', 'in_progress', 'completed', 'archived');

create table public.events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  type public.event_type not null default 'tournament',
  name text not null,
  status public.event_status not null default 'draft',
  state jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.events enable row level security;

create policy "events_org_member_read" on public.events for select
  to authenticated
  using (org_id in (select * from public.user_org_ids(auth.uid())));

create policy "events_organizer_write" on public.events for all
  to authenticated
  using (public.is_org_organizer(org_id, auth.uid()))
  with check (public.is_org_organizer(org_id, auth.uid()));

create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

create index events_org_id_updated_at_idx
  on public.events (org_id, updated_at desc);
