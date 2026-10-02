-- =============================================================================
-- The right to be forgotten, as a button instead of an email.
--
-- Deleting your own account means deleting a row in auth.users, which no
-- ordinary user may touch. A SECURITY DEFINER function owned by the database
-- owner can, and this one will only ever delete the caller's own row — the id
-- comes from auth.uid(), never from an argument, so there is nothing to tamper
-- with.
--
-- Everything else follows: profiles.id references auth.users on delete cascade,
-- and projects, lesson_progress, class_members, reviews and activity_events all
-- cascade from profiles. The one thing that does not cascade is the Scratch
-- file in Storage, so this removes those rows by hand first.
--
-- Run this whole file in the Supabase SQL editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Delete the caller's own account, and everything attached to it.
-- -----------------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  -- A teacher who still owns classes would take their pupils' classes down
  -- with them, which is not theirs to decide. Say so instead of doing it.
  if exists (select 1 from public.classes where teacher_id = me and not archived) then
    raise exception 'still_teaching'
      using hint = 'Archive or hand over your classes before deleting your account.';
  end if;

  -- Scratch files live in Storage, which has no foreign key to cascade along.
  delete from storage.objects
  where bucket_id = 'projects'
    and name in (
      select storage_path from public.projects
      where owner_id = me and storage_path is not null
    );

  -- Note on a teacher's marks: reviews.reviewer_id is NOT NULL and cascades,
  -- so the feedback this teacher wrote on pupils' work goes with them. The
  -- pupils keep their projects; they lose the comments. That is the right way
  -- round — the comments are the teacher's own writing — but it is worth
  -- knowing before pressing the button, and the confirmation screen says so.

  -- One row, and the cascades take the rest: profile, projects, progress,
  -- class membership, submitted work, activity.
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;


-- -----------------------------------------------------------------------------
-- A teacher deleting a pupil's account, at a parent's or the school's request.
--
-- Restricted to pupils in a class the caller teaches, and to the internal
-- pupil domain, so this can never be turned on a colleague's account.
-- -----------------------------------------------------------------------------
create or replace function public.delete_student_account(student uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
begin
  if public.my_role() not in ('teacher', 'admin') then
    raise exception 'Only a teacher can do this';
  end if;

  -- An admin may reach any pupil; a teacher only their own.
  if public.my_role() = 'teacher' and not public.teaches_student(student) then
    raise exception 'That pupil is not in one of your classes';
  end if;

  select email into target_email from auth.users where id = student;
  if target_email is null then
    return false;
  end if;

  -- Deliberately narrow: accounts with a real address belong to adults, and an
  -- adult's account is theirs to delete.
  if target_email not like '%@leerling.start2code.app' then
    raise exception 'That is not a pupil account';
  end if;

  delete from storage.objects
  where bucket_id = 'projects'
    and name in (
      select storage_path from public.projects
      where owner_id = student and storage_path is not null
    );

  delete from auth.users where id = student;
  return true;
end;
$$;

revoke all on function public.delete_student_account(uuid) from public;
grant execute on function public.delete_student_account(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- Accounts nobody has used for two years, as the privacy policy promises.
--
-- Not scheduled automatically: deleting a classroom's worth of work on a timer
-- that nobody is watching is how a school loses a year of projects to a bug.
-- Run it by hand, or schedule it with pg_cron once you trust the count it
-- reports. Check first:
--
--   select count(*) from auth.users
--   where coalesce(last_sign_in_at, created_at) < now() - interval '24 months';
-- -----------------------------------------------------------------------------
create or replace function public.delete_dormant_accounts(older_than interval default '24 months')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if public.my_role() <> 'admin' then
    raise exception 'Only an admin can do this';
  end if;

  with stale as (
    select id from auth.users
    where coalesce(last_sign_in_at, created_at) < now() - older_than
  ),
  gone_files as (
    delete from storage.objects
    where bucket_id = 'projects'
      and name in (
        select p.storage_path from public.projects p
        join stale s on s.id = p.owner_id
        where p.storage_path is not null
      )
    returning 1
  )
  delete from auth.users u using stale s where u.id = s.id;

  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.delete_dormant_accounts(interval) from public;
grant execute on function public.delete_dormant_accounts(interval) to authenticated;
