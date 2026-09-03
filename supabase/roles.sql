-- =============================================================================
-- Start2Code — more roles than student / teacher / admin
--
-- The profiles table only accepted three roles, so an admin could not mark
-- anyone as a parent or a tester. This widens the list and keeps the same rule
-- about who may pick what:
--
--   student  the default: own projects and progress, joins a class with a code
--   parent   a grown-up account, no access to anyone else's work (yet)
--   tester   the same as a student, but recognisable as a trial account
--   teacher  creates classes and sees their own students' work
--   admin    everything, plus changing anyone's role
--
-- Only student, parent and teacher may be chosen on the sign-up form. Anything
-- that sees more than your own work stays an admin's decision, and role changes
-- are still guarded by the profiles_guard_role trigger in schema.sql.
--
-- The same list lives in src/lib/roles.js — change both together.
--
-- Safe to run more than once.
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'parent', 'tester', 'teacher', 'admin'));

-- New auth users still get a profile automatically, but may now arrive as a
-- parent as well. Anything else in the sign-up metadata falls back to student.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when new.raw_user_meta_data ->> 'role' in ('teacher', 'parent')
        then new.raw_user_meta_data ->> 'role'
      else 'student'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
