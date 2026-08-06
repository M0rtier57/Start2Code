-- =============================================================================
-- Start2Code — database schema
-- Run this whole file in the Supabase SQL editor (it is idempotent).
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Profiles (one row per auth user)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  avatar      text,
  created_at  timestamptz not null default now()
);

-- New auth users automatically get a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    -- Only 'student' or 'teacher' may be self-selected at sign-up; admin is granted manually.
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Classes and membership
-- -----------------------------------------------------------------------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  join_code   text not null unique,
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id    uuid not null references public.classes (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index if not exists class_members_student_idx on public.class_members (student_id);
create index if not exists classes_teacher_idx on public.classes (teacher_id);

-- -----------------------------------------------------------------------------
-- Projects
--   Python projects store their source in `code`.
--   Scratch projects store an .sb3 in Storage; `storage_path` points at it.
-- -----------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  kind          text not null check (kind in ('scratch', 'python')),
  title         text not null default 'Untitled project',
  code          text,
  storage_path  text,
  thumbnail     text,
  lesson_id     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id, updated_at desc);

-- -----------------------------------------------------------------------------
-- Lesson progress (one row per user per lesson)
-- -----------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  track           text not null check (track in ('scratch', 'python')),
  lesson_id       text not null,
  status          text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  completed_steps int not null default 0,
  total_steps     int not null default 0,
  updated_at      timestamptz not null default now(),
  unique (user_id, track, lesson_id)
);

create index if not exists lesson_progress_user_idx on public.lesson_progress (user_id);

-- -----------------------------------------------------------------------------
-- Activity log — powers the teacher timeline
-- -----------------------------------------------------------------------------
create table if not exists public.activity_events (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists activity_user_idx on public.activity_events (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so RLS policies do not recurse)
-- -----------------------------------------------------------------------------
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'student');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.my_role() = 'admin';
$$;

-- True when the current user teaches (or administers) a class containing `student`.
create or replace function public.teaches_student(student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1
    from public.class_members cm
    join public.classes c on c.id = cm.class_id
    where cm.student_id = student
      and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_member_of(class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.class_members
    where class_id = class and student_id = auth.uid()
  );
$$;

-- Students join a class by code without needing read access to every class.
create or replace function public.join_class_by_code(code text)
returns public.classes
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.classes;
begin
  select * into target from public.classes
  where upper(join_code) = upper(trim(code)) and archived = false;

  if target.id is null then
    raise exception 'No class found with that code';
  end if;

  insert into public.class_members (class_id, student_id)
  values (target.id, auth.uid())
  on conflict do nothing;

  return target;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.classes         enable row level security;
alter table public.class_members   enable row level security;
alter table public.projects        enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.activity_events enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.teaches_student(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- A student must never be able to promote themselves. Role changes are
-- restricted to admins by this trigger, which RLS alone cannot express.
create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.uid() is null for trusted connections: the SQL editor, the service
  -- role key, migrations. Those are already privileged, and the first admin
  -- has to be created from one of them. Only guard real end-user requests.
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_role_change();

-- classes ----------------------------------------------------------------
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select
  using (teacher_id = auth.uid() or public.is_admin() or public.is_member_of(id));

drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert
  with check (teacher_id = auth.uid() and public.my_role() in ('teacher', 'admin'));

drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes for update
  using (teacher_id = auth.uid() or public.is_admin());

drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes for delete
  using (teacher_id = auth.uid() or public.is_admin());

-- class_members ----------------------------------------------------------
drop policy if exists members_select on public.class_members;
create policy members_select on public.class_members for select
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

drop policy if exists members_insert on public.class_members;
create policy members_insert on public.class_members for insert
  with check (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

drop policy if exists members_delete on public.class_members;
create policy members_delete on public.class_members for delete
  using (
    student_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

-- projects ---------------------------------------------------------------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects for select
  using (owner_id = auth.uid() or public.teaches_student(owner_id));

drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert
  with check (owner_id = auth.uid());

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete
  using (owner_id = auth.uid() or public.is_admin());

-- lesson_progress --------------------------------------------------------
drop policy if exists progress_select on public.lesson_progress;
create policy progress_select on public.lesson_progress for select
  using (user_id = auth.uid() or public.teaches_student(user_id));

drop policy if exists progress_write on public.lesson_progress;
create policy progress_write on public.lesson_progress for insert
  with check (user_id = auth.uid());

drop policy if exists progress_update on public.lesson_progress;
create policy progress_update on public.lesson_progress for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- activity_events --------------------------------------------------------
drop policy if exists activity_select on public.activity_events;
create policy activity_select on public.activity_events for select
  using (user_id = auth.uid() or public.teaches_student(user_id));

drop policy if exists activity_insert on public.activity_events;
create policy activity_insert on public.activity_events for insert
  with check (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Storage bucket for Scratch .sb3 files
-- Files live at  <user-id>/<project-id>.sb3  so ownership is path-derived.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('projects', 'projects', false)
on conflict (id) do nothing;

drop policy if exists projects_storage_read on storage.objects;
create policy projects_storage_read on storage.objects for select
  using (
    bucket_id = 'projects'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] = auth.uid()::text
      -- The uuid cast is guarded: a stray path that is not a user id would
      -- otherwise raise and break the whole listing.
      or (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        and public.teaches_student(((storage.foldername(name))[1])::uuid)
      )
    )
  );

drop policy if exists projects_storage_write on storage.objects;
create policy projects_storage_write on storage.objects for insert
  with check (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists projects_storage_update on storage.objects;
create policy projects_storage_update on storage.objects for update
  using (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists projects_storage_delete on storage.objects;
create policy projects_storage_delete on storage.objects for delete
  using (bucket_id = 'projects' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- Keep updated_at fresh
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists progress_touch on public.lesson_progress;
create trigger progress_touch before update on public.lesson_progress
  for each row execute function public.touch_updated_at();
