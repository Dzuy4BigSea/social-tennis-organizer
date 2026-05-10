-- Phase 1 schema: clubs, profiles, roles, people, events, and event children.
-- All ids are uuid; timestamps are timestamptz.

create extension if not exists "pgcrypto";

create table public.clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  club_id       uuid references public.clubs(id) on delete set null,
  display_name  text not null,
  created_at    timestamptz not null default now()
);

create type public.club_role as enum ('head_pro', 'pro', 'member');

create table public.roles (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  club_id   uuid not null references public.clubs(id) on delete cascade,
  role      public.club_role not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, club_id, role)
);

create index roles_club_idx on public.roles(club_id);

-- Directory of players. Includes both signed-up users (linked via profile_id)
-- and non-auth roster entries (CSV/manual). Email is optional; a person may
-- exist without one until they sign up.
create table public.people (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  full_name   text not null,
  email       text,
  profile_id  uuid references public.profiles(id) on delete set null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index people_club_email_uniq
  on public.people(club_id, lower(email))
  where email is not null;

create unique index people_profile_uniq
  on public.people(profile_id)
  where profile_id is not null;

create index people_club_idx on public.people(club_id);

create type public.event_status as enum ('draft', 'live', 'completed', 'archived');

create table public.events (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  owner_id      uuid not null references public.profiles(id) on delete restrict,
  name          text not null,
  event_type    text not null,
  scheduled_at  timestamptz,
  status        public.event_status not null default 'draft',
  settings      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index events_club_idx on public.events(club_id);
create index events_owner_idx on public.events(owner_id);

create table public.event_participants (
  event_id    uuid not null references public.events(id) on delete cascade,
  person_id   uuid not null references public.people(id) on delete cascade,
  seed        int,
  group_label text,
  added_at    timestamptz not null default now(),
  primary key (event_id, person_id)
);

create table public.event_collaborators (
  event_id    uuid not null references public.events(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  granted_at  timestamptz not null default now(),
  primary key (event_id, profile_id)
);

-- Single live state blob per event (bracket/standings/scores).
-- Kept as one row + jsonb to mirror the existing in-memory store shape;
-- can be normalized later if we need cross-event queries on match data.
create table public.event_state (
  event_id    uuid primary key references public.events(id) on delete cascade,
  state       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

create table public.event_join_codes (
  code        text primary key,
  event_id    uuid not null references public.events(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create index event_join_codes_event_idx on public.event_join_codes(event_id);

-- Auto-create a profile row when a new auth user appears. The display_name
-- defaults to the email local-part; the user can update it later.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'player'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

create trigger event_state_touch before update on public.event_state
  for each row execute function public.touch_updated_at();
