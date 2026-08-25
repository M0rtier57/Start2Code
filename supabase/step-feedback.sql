-- =============================================================================
-- Start2Code — per-step feedback
--
-- Two gaps this closes:
--
--   1. Which steps a child ticked lived only in that browser's localStorage, so
--      a teacher could see "3 of 5 done" but never *which* three — and the ticks
--      vanished if the child moved to another computer. They are now stored
--      alongside the count.
--
--   2. A review could only carry one general comment. A teacher marking a
--      five-step exercise usually wants to say something about a particular
--      step, so each review can now hold a note per step as well.
--
-- Safe to run more than once.
-- =============================================================================

-- Which step numbers are ticked, e.g. [0, 1, 3].
alter table public.lesson_progress
  add column if not exists steps_done jsonb not null default '[]'::jsonb;

-- Notes keyed by step number, e.g. {"2": "Deze lus klopt nog niet"}.
alter table public.reviews
  add column if not exists step_feedback jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

select
  (select count(*) from public.lesson_progress) as progress_rows,
  (select count(*) from public.reviews)         as review_rows;
