-- =============================================================================
-- Start2Code — handing work in for review
--
-- Until now every project a child owned appeared in the teacher's list. Now a
-- child decides when something is ready, and only handed-in work reaches the
-- teacher's queue.
--
-- The flow, expressed with two timestamps and the existing reviews table:
--
--   submitted_at = null                      still working, private to the child
--   submitted_at > review.updated_at         waiting to be marked
--   review.verdict = 'pass'                  finished
--   review.verdict = 'fail'                  child corrects it, hands in again,
--                                            which bumps submitted_at and puts
--                                            it back in the queue
--
-- Safe to run more than once.
-- =============================================================================

alter table public.projects add column if not exists submitted_at timestamptz;

-- The queue is "handed in, and not marked since" — index accordingly.
create index if not exists projects_submitted_idx
  on public.projects (submitted_at desc)
  where submitted_at is not null;

-- -----------------------------------------------------------------------------
-- Handing in is the child's own action, so it goes through the normal update
-- policy on projects (owner only). Nothing new is needed there.
--
-- A teacher must not be able to hand work in on a child's behalf, and must not
-- be able to change the work itself — that is already true, because
-- projects_update is restricted to the owner.
-- -----------------------------------------------------------------------------

notify pgrst, 'reload schema';

select
  count(*) filter (where submitted_at is not null) as handed_in,
  count(*)                                          as projects_total
from public.projects;
