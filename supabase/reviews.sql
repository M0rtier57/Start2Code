-- =============================================================================
-- Start2Code — teacher review of a project
--
-- A teacher marks a project pass or fail, optionally scores it, and writes
-- feedback the child can act on. One review per project: re-reviewing updates
-- the same row, so a child always sees the current verdict rather than a pile
-- of old ones.
--
-- Safe to run more than once. Paste into the Supabase SQL editor and Run.
-- =============================================================================

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null unique references public.projects (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  verdict     text not null check (verdict in ('pass', 'fail')),
  score       int check (score is null or (score >= 0 and score <= 100)),
  feedback    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reviews_project_idx on public.reviews (project_id);

-- -----------------------------------------------------------------------------
-- Who owns the project being reviewed.
--
-- SECURITY DEFINER so the policies below can look it up without depending on
-- the caller's own visibility of the projects table.
-- -----------------------------------------------------------------------------
create or replace function public.project_owner(project uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from public.projects where id = project;
$$;

-- -----------------------------------------------------------------------------
-- Row level security
--
-- A child may read the review of their own work but never write one;
-- teaches_student() already returns true for admins.
-- -----------------------------------------------------------------------------
alter table public.reviews enable row level security;

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select
  using (
    public.project_owner(project_id) = auth.uid()
    or public.teaches_student(public.project_owner(project_id))
  );

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and public.teaches_student(public.project_owner(project_id))
  );

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (public.teaches_student(public.project_owner(project_id)))
  with check (
    reviewer_id = auth.uid()
    and public.teaches_student(public.project_owner(project_id))
  );

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using (public.teaches_student(public.project_owner(project_id)));

-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

notify pgrst, 'reload schema';

select count(*) as reviews_table_ready from information_schema.tables
where table_schema = 'public' and table_name = 'reviews';
