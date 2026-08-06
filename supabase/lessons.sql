-- =============================================================================
-- Start2Code — custom lessons (add-on migration)
--
-- Everything here is also in schema.sql; this file exists so an existing
-- database can pick up just the lessons feature without re-running the lot.
-- Safe to run more than once.
--
-- Paste the whole file into the Supabase SQL editor and press Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  lesson_key  text not null unique,
  track       text not null check (track in ('scratch', 'python')),
  title       text not null,
  blurb       text not null default '',
  minutes     int  not null default 15,
  mode        text not null default 'console' check (mode in ('console', 'game')),
  steps       jsonb not null default '[]'::jsonb,
  starter     text,          -- Python: the starting source code
  starter_path text,         -- Scratch: an .sb3 in the lesson-assets bucket
  scope       text not null default 'private',
  class_id    uuid references public.classes (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  position    int not null default 0,
  archived    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- Constraints are added below by name so this file can also upgrade a table
  -- created by an earlier version.
  constraint lessons_scope_class check (
    (scope = 'class' and class_id is not null) or
    (scope in ('private', 'global') and class_id is null)
  )
);

alter table public.lessons add column if not exists starter_path text;

-- Visibility. 'private' was added later, so the old constraints are replaced
-- rather than assumed.
--   private → only the author (drafts)
--   class   → one class the author teaches
--   global  → everyone (admins only)
alter table public.lessons drop constraint if exists lessons_scope_check;
alter table public.lessons add  constraint lessons_scope_check
  check (scope in ('private', 'class', 'global'));

alter table public.lessons drop constraint if exists lessons_scope_class;
alter table public.lessons add  constraint lessons_scope_class check (
  (scope = 'class' and class_id is not null) or
  (scope in ('private', 'global') and class_id is null)
);

create index if not exists lessons_class_idx on public.lessons (class_id);
create index if not exists lessons_scope_idx on public.lessons (scope);

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.lessons enable row level security;

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select
  using (
    scope = 'global'
    or author_id = auth.uid()
    or public.is_admin()
    or public.is_member_of(class_id)
    or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  );

-- Anyone may keep private drafts. Publishing to a class requires teaching it;
-- publishing to everyone requires being an admin.
drop policy if exists lessons_insert on public.lessons;
create policy lessons_insert on public.lessons for insert
  with check (
    author_id = auth.uid()
    and (
      public.is_admin()
      or scope = 'private'
      or (
        scope = 'class'
        and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
      )
    )
  );

-- The `with check` clause repeats the insert rule, so a teacher cannot edit a
-- private draft or a class lesson into a global one.
drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update
  using (author_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      author_id = auth.uid()
      and (
        scope = 'private'
        or (
          scope = 'class'
          and exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
        )
      )
    )
  );

drop policy if exists lessons_delete on public.lessons;
create policy lessons_delete on public.lessons for delete
  using (author_id = auth.uid() or public.is_admin());

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lessons_touch on public.lessons;
create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Storage for Scratch starting projects
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('lesson-assets', 'lesson-assets', true)
on conflict (id) do update set public = true;

drop policy if exists lesson_assets_read on storage.objects;
create policy lesson_assets_read on storage.objects for select
  using (bucket_id = 'lesson-assets');

drop policy if exists lesson_assets_write on storage.objects;
create policy lesson_assets_write on storage.objects for insert
  with check (bucket_id = 'lesson-assets' and public.my_role() in ('teacher', 'admin'));

drop policy if exists lesson_assets_update on storage.objects;
create policy lesson_assets_update on storage.objects for update
  using (bucket_id = 'lesson-assets' and public.my_role() in ('teacher', 'admin'));

drop policy if exists lesson_assets_delete on storage.objects;
create policy lesson_assets_delete on storage.objects for delete
  using (bucket_id = 'lesson-assets' and public.my_role() in ('teacher', 'admin'));

-- -----------------------------------------------------------------------------
-- Tell PostgREST about the new table straight away, instead of waiting for it
-- to notice. Without this you get:
--   "Could not find the table 'public.lessons' in the schema cache"
-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

-- Confirmation — this should return one row.
select count(*) as lessons_table_ready from information_schema.tables
where table_schema = 'public' and table_name = 'lessons';
