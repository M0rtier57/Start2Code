-- =============================================================================
-- Start2Code — unlock the accounts that existed before email confirmation
--                was switched on
--
-- Everybody who signed up while "Confirm email" was off has no
-- email_confirmed_at. Turning confirmation on locks every one of those accounts
-- out, and Supabase reports it as "Invalid login credentials" — the same
-- message as a wrong password, which is what makes it so confusing.
--
-- These accounts were created legitimately under the rules of the time, so they
-- are confirmed here. Anyone signing up from now on goes through the mail.
--
-- RUN STEP 1 FIRST and read it before running step 2.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Step 1 — who is affected? Read-only.
-- -----------------------------------------------------------------------------
select
  count(*)                                         as accounts_total,
  count(*) filter (where email_confirmed_at is null) as not_confirmed,
  min(created_at) filter (where email_confirmed_at is null) as oldest_unconfirmed,
  max(created_at) filter (where email_confirmed_at is null) as newest_unconfirmed
from auth.users;

-- The list itself, so you can see it is who you expect:
select email, created_at, email_confirmed_at
from auth.users
where email_confirmed_at is null
order by created_at;

-- -----------------------------------------------------------------------------
-- Step 2 — confirm them.
--
-- The cut-off keeps this honest: only accounts that already existed are
-- unlocked. Change the timestamp to the moment you switched confirmation on if
-- you want to be stricter — anything created after it still has to use the mail.
-- -----------------------------------------------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null
  and created_at < now();

-- -----------------------------------------------------------------------------
-- Step 3 — check nothing is left locked out.
-- -----------------------------------------------------------------------------
select count(*) as still_not_confirmed
from auth.users
where email_confirmed_at is null;
