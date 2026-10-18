-- =============================================================================
-- Several files per Python project, and sprites to use in pygame.
--
--   files   — the extra .py files of a project, as [{ "name": "...", "content": "..." }].
--             The main file stays in projects.code, exactly as before, so every
--             existing project and every query that reads it keeps working.
--   assets  — the sprites a project uses, as
--             [{ "name": "...", "source": "library" | "upload", "ref": "..." }].
--             A library sprite points at a file shipped with the site; an upload
--             points at an object in the 'projects' bucket under
--             <user-id>/assets/<project-id>/, so the existing storage policies
--             already give the child, and only the teacher of that child, access.
--
-- They are columns on the project rather than tables of their own, on purpose:
-- the same row level security that protects the project protects them, they are
-- saved in the same write as the code, and a project can never be half saved.
--
-- Run this whole file in the Supabase SQL editor. Safe to run twice.
-- =============================================================================

alter table public.projects
  add column if not exists files  jsonb not null default '[]'::jsonb,
  add column if not exists assets jsonb not null default '[]'::jsonb;

-- Keep a project from becoming a dumping ground. The app enforces the same
-- limits first; this is for anyone who talks to the database directly.
alter table public.projects drop constraint if exists projects_files_shape;
alter table public.projects add constraint projects_files_shape
  check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) <= 20);

alter table public.projects drop constraint if exists projects_assets_shape;
alter table public.projects add constraint projects_assets_shape
  check (jsonb_typeof(assets) = 'array' and jsonb_array_length(assets) <= 40);

-- Deleting an account or a project must take the uploaded images with it. The
-- account functions in data-deletion.sql do that; run that file again as well.
