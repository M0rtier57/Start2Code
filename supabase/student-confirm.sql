-- =============================================================================
-- Start2Code — keep bulk-created student accounts working with email
-- confirmation switched on
--
-- Children created by a teacher in bulk get an address on
-- leerling.start2code.app, a domain deliberately owned by nobody: it exists
-- only because Supabase Auth insists on an email shape. A confirmation mail
-- sent there can never be answered, so with "Confirm email" on those accounts
-- would be created and then be impossible to log in to.
--
-- This marks exactly those accounts as confirmed, and nothing else. The domain
-- check is the guard: a teacher cannot use it to confirm a real address that
-- belongs to somebody else.
--
-- Safe to run more than once.
-- =============================================================================

create or replace function public.confirm_student_account(student uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  done boolean;
begin
  if public.my_role() not in ('teacher', 'admin') then
    raise exception 'Only a teacher or an admin can confirm a student account';
  end if;

  -- Only the internal domain, and only if not already confirmed.
  -- confirmed_at is a generated column in current Supabase, so it is left
  -- alone; setting email_confirmed_at is what actually unlocks the login.
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = student
    and email like '%@leerling.start2code.app'
  returning true into done;

  return coalesce(done, false);
end;
$$;

revoke all on function public.confirm_student_account(uuid) from public;
grant execute on function public.confirm_student_account(uuid) to authenticated;

notify pgrst, 'reload schema';

select 'confirm_student_account installed' as status;
