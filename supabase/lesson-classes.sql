-- =============================================================================
-- Start2Code — a lesson can belong to several classes
--
-- Replaces the single `lessons.class_id` column with a join table. Existing
-- rows are carried across automatically, then the old column is dropped.
--
-- Safe to run more than once. Paste into the Supabase SQL editor and Run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Join table
-- -----------------------------------------------------------------------------
create table if not exists public.lesson_classes (
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lesson_id, class_id)
);

create index if not exists lesson_classes_class_idx on public.lesson_classes (class_id);

-- -----------------------------------------------------------------------------
-- The existing policies mention class_id, and Postgres refuses to drop a column
-- that a policy depends on. They are removed here and rebuilt further down
-- against the join table.
-- -----------------------------------------------------------------------------
drop policy if exists lessons_select on public.lessons;
drop policy if exists lessons_insert on public.lessons;
drop policy if exists lessons_update on public.lessons;

-- -----------------------------------------------------------------------------
-- Migrate off lessons.class_id, once. Guarded on the column still existing so
-- a second run is a no-op rather than an error.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'class_id'
  ) then
    insert into public.lesson_classes (lesson_id, class_id)
      select id, class_id from public.lessons where class_id is not null
      on conflict do nothing;

    -- The constraint tied scope to that column, so it goes too.
    alter table public.lessons drop constraint if exists lessons_scope_class;
    alter table public.lessons drop column class_id;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Visibility helper
--
-- SECURITY DEFINER so the lessons policy can consult lesson_classes without
-- triggering that table's own policy — which would recurse.
-- -----------------------------------------------------------------------------
create or replace function public.lesson_shared_with_me(lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lesson_classes lc
    where lc.lesson_id = lesson
      and (
        exists (select 1 from public.class_members cm
                where cm.class_id = lc.class_id and cm.student_id = auth.uid())
        or exists (select 1 from public.classes c
                   where c.id = lc.class_id and c.teacher_id = auth.uid())
      )
  );
$$;

-- True when the current user teaches the given class (or is an admin).
create or replace function public.teaches_class(class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.classes c where c.id = class and c.teacher_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Lessons policies, rewritten for the join table
-- -----------------------------------------------------------------------------
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select
  using (
    scope = 'global'
    or author_id = auth.uid()
    or public.is_admin()
    or public.lesson_shared_with_me(id)
  );

-- Which classes a lesson reaches is now decided in lesson_classes, so the
-- lessons row itself only has to answer "may this person publish at all".
drop policy if exists lessons_insert on public.lessons;
create policy lessons_insert on public.lessons for insert
  with check (
    author_id = auth.uid()
    and (public.is_admin() or scope in ('private', 'class'))
  );

drop policy if exists lessons_update on public.lessons;
create policy lessons_update on public.lessons for update
  using (author_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (author_id = auth.uid() and scope in ('private', 'class'))
  );

-- -----------------------------------------------------------------------------
-- Join table policies
-- -----------------------------------------------------------------------------
alter table public.lesson_classes enable row level security;

drop policy if exists lesson_classes_select on public.lesson_classes;
create policy lesson_classes_select on public.lesson_classes for select
  using (
    public.is_admin()
    or public.is_member_of(class_id)
    or public.teaches_class(class_id)
    or exists (select 1 from public.lessons l where l.id = lesson_id and l.author_id = auth.uid())
  );

-- A lesson may only be handed to a class you actually teach, and only by the
-- person who wrote it.
drop policy if exists lesson_classes_insert on public.lesson_classes;
create policy lesson_classes_insert on public.lesson_classes for insert
  with check (
    public.teaches_class(class_id)
    and (
      public.is_admin()
      or exists (select 1 from public.lessons l where l.id = lesson_id and l.author_id = auth.uid())
    )
  );

drop policy if exists lesson_classes_delete on public.lesson_classes;
create policy lesson_classes_delete on public.lesson_classes for delete
  using (
    public.teaches_class(class_id)
    and (
      public.is_admin()
      or exists (select 1 from public.lessons l where l.id = lesson_id and l.author_id = auth.uid())
    )
  );

-- -----------------------------------------------------------------------------
notify pgrst, 'reload schema';

select
  (select count(*) from public.lesson_classes) as class_links,
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'class_id'
  ) as old_column_removed;
