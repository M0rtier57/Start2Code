-- =============================================================================
-- "Open all levels" for a class.
--
-- Children in a class work through the teacher's levels in order: the next one
-- opens when the previous project has been handed in. A teacher can switch that
-- off for a whole class — to catch a child up, to run a one-off session, or
-- simply because the order does not matter that week.
--
-- The flag lives on the class. The existing policies already let the class's
-- teacher update it and the class's members read it, so nothing else changes.
--
-- Run this whole file in the Supabase SQL editor. Safe to run twice.
-- =============================================================================

alter table public.classes
  add column if not exists lessons_open boolean not null default false;
