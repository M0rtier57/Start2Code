-- =============================================================================
-- Private labels a teacher puts on a child's projects.
--
-- Purpose: telling the real projects from the rubbish. A child opens a blank
-- Scratch project, clicks twice and leaves; the teacher wants that out of the
-- way without deleting it (it is the child's, not the teacher's).
--
-- The labels belong to the teacher who made them and are invisible to
-- everybody else — the child above all. Both tables are locked to
-- auth.uid() = teacher_id, and a child's own queries cannot even see the rows
-- exist. A label is not a mark: it does not reach the child, the class, or
-- another teacher.
--
-- Run this whole file in the Supabase SQL editor. Safe to run twice.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The labels themselves: "Rommel", "Echt project", "Nakijken"...
-- Shared across all of one teacher's children, so "Rommel" means one thing.
-- -----------------------------------------------------------------------------
create table if not exists public.teacher_labels (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  color       text not null default 'grey'
              check (color in ('grey', 'teal', 'sun', 'coral', 'sky', 'grape')),
  created_at  timestamptz not null default now()
);

-- "rommel" and "Rommel" are the same label; two of them is a mistake.
create unique index if not exists teacher_labels_name_idx
  on public.teacher_labels (teacher_id, lower(btrim(name)));

-- -----------------------------------------------------------------------------
-- Which label sits on which project. A project can carry several.
-- -----------------------------------------------------------------------------
create table if not exists public.project_labels (
  project_id  uuid not null references public.projects (id) on delete cascade,
  label_id    uuid not null references public.teacher_labels (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, label_id)
);

create index if not exists project_labels_label_idx on public.project_labels (label_id);

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.teacher_labels enable row level security;
alter table public.project_labels enable row level security;

drop policy if exists teacher_labels_own on public.teacher_labels;
create policy teacher_labels_own on public.teacher_labels
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Reading and removing: only through a label that is yours.
drop policy if exists project_labels_select on public.project_labels;
create policy project_labels_select on public.project_labels
  for select
  using (exists (
    select 1 from public.teacher_labels l
    where l.id = label_id and l.teacher_id = auth.uid()
  ));

drop policy if exists project_labels_delete on public.project_labels;
create policy project_labels_delete on public.project_labels
  for delete
  using (exists (
    select 1 from public.teacher_labels l
    where l.id = label_id and l.teacher_id = auth.uid()
  ));

-- Adding needs two things to be true at once: the label is yours, and the
-- project belongs to a child you teach. Without the second half a teacher
-- could label — and so probe the existence of — any project in the system by
-- guessing ids.
drop policy if exists project_labels_insert on public.project_labels;
create policy project_labels_insert on public.project_labels
  for insert
  with check (
    exists (
      select 1 from public.teacher_labels l
      where l.id = label_id and l.teacher_id = auth.uid()
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id and public.teaches_student(p.owner_id)
    )
  );

-- Nothing here is ever granted to anon. Signed-in users reach it only through
-- the policies above.
revoke all on public.teacher_labels from anon;
revoke all on public.project_labels from anon;
grant select, insert, update, delete on public.teacher_labels to authenticated;
grant select, insert, delete on public.project_labels to authenticated;
