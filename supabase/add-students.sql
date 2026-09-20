-- =============================================================================
-- Start2Code — add an existing child to a class by hand
--
-- Inserting into class_members is already allowed for the teacher of that class
-- (see members_insert in schema.sql). What was missing is a way to *find* a
-- child who is not in any of your classes yet: profiles_select deliberately
-- limits a teacher to the students they already teach.
--
-- This adds one narrow search function rather than widening that policy, so a
-- teacher can look a child up by name or email without being able to read the
-- whole user table.
--
-- Safe to run more than once.
-- =============================================================================

create or replace function public.search_students(q text)
returns table (id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where
    -- Only staff may search at all.
    public.my_role() in ('teacher', 'admin')
    -- Never returns teachers or admins.
    and p.role = 'student'
    -- At least two characters, so this cannot be used to list every child.
    and length(trim(coalesce(q, ''))) >= 2
    and (
      p.full_name ilike '%' || trim(q) || '%'
      or p.email  ilike '%' || trim(q) || '%'
    )
  order by p.full_name nulls last, p.email
  limit 25;
$$;

revoke all on function public.search_students(text) from public;
grant execute on function public.search_students(text) to authenticated;

notify pgrst, 'reload schema';

-- Should return 0 rows when run from the SQL editor: there is no signed-in
-- user there, so my_role() is not teacher or admin. That is the guard working.
select count(*) as visible_to_anonymous from public.search_students('a');
