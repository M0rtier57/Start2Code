-- =============================================================================
-- Start2Code — merging two accounts
--
-- Children who forget a password tend to make a second account rather than ask.
-- This joins the two back together: every project, every bit of progress and
-- every class membership moves to the account that is kept, and the admin
-- chooses which name and which login email survive.
--
-- Everything runs inside one function so it is one transaction: either the
-- whole merge happens, or nothing does.
--
-- Safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A Scratch file lives at  <owner-id>/<project-id>.sb3  and the read policy
-- checks that folder against the caller. Moving a project to another account
-- does not move the file, so without this clause a child could no longer open
-- their own merged Scratch work.
--
-- Whoever owns the project row may read its file, wherever it happens to sit.
-- -----------------------------------------------------------------------------
drop policy if exists projects_storage_read on storage.objects;
create policy projects_storage_read on storage.objects for select
  using (
    bucket_id = 'projects'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.projects p
        where p.storage_path = name
          and (p.owner_id = auth.uid() or public.teaches_student(p.owner_id))
      )
      or (
        (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
        and public.teaches_student(((storage.foldername(name))[1])::uuid)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- What would move? Shown to the admin before anything is touched.
-- -----------------------------------------------------------------------------
create or replace function public.merge_preview(duplicate uuid, keep uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can merge accounts';
  end if;

  select jsonb_build_object(
    'projects',      (select count(*) from public.projects        where owner_id    = duplicate),
    'progress',      (select count(*) from public.lesson_progress where user_id     = duplicate),
    'classes',       (select count(*) from public.class_members   where student_id  = duplicate),
    'activity',      (select count(*) from public.activity_events where user_id     = duplicate),
    'taught',        (select count(*) from public.classes         where teacher_id  = duplicate),
    'lessons',       (select count(*) from public.lessons         where author_id   = duplicate),
    'reviews',       (select count(*) from public.reviews         where reviewer_id = duplicate),
    'duplicate',     (select to_jsonb(p) from public.profiles p where p.id = duplicate),
    'keep',          (select to_jsonb(p) from public.profiles p where p.id = keep)
  ) into result;

  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Do it.
--
-- new_name / new_email are optional: leave them null to keep what the surviving
-- account already has.
-- -----------------------------------------------------------------------------
create or replace function public.merge_accounts(
  duplicate uuid,
  keep      uuid,
  new_name  text default null,
  new_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  moved jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can merge accounts';
  end if;

  if duplicate is null or keep is null or duplicate = keep then
    raise exception 'Pick two different accounts';
  end if;

  if not exists (select 1 from public.profiles where id = duplicate)
     or not exists (select 1 from public.profiles where id = keep) then
    raise exception 'One of those accounts no longer exists';
  end if;

  -- Count first: after the move there is nothing left to count.
  moved := public.merge_preview(duplicate, keep);

  ------------------------------------------------------------------ progress --
  -- lesson_progress is unique per (user, track, lesson), so where both accounts
  -- worked on the same lesson only one row can survive. The further-along one
  -- wins, which is what a child would expect.
  delete from public.lesson_progress d
  using public.lesson_progress k
  where d.user_id = duplicate
    and k.user_id = keep
    and d.track = k.track
    and d.lesson_id = k.lesson_id
    and d.completed_steps <= k.completed_steps;

  -- Anything still on the duplicate side is now strictly better, so the kept
  -- side gives way.
  delete from public.lesson_progress k
  using public.lesson_progress d
  where k.user_id = keep
    and d.user_id = duplicate
    and d.track = k.track
    and d.lesson_id = k.lesson_id;

  update public.lesson_progress set user_id = keep where user_id = duplicate;

  ------------------------------------------------------------------- classes --
  -- Already in the same class on both accounts: drop the duplicate membership.
  delete from public.class_members d
  using public.class_members k
  where d.student_id = duplicate
    and k.student_id = keep
    and d.class_id = k.class_id;

  update public.class_members set student_id = keep where student_id = duplicate;

  ------------------------------------------------------------ the rest moves --
  -- Projects keep their storage_path pointing at the old folder; the policy
  -- above is what keeps those files readable.
  update public.projects        set owner_id    = keep where owner_id    = duplicate;
  update public.activity_events set user_id     = keep where user_id     = duplicate;
  update public.classes         set teacher_id  = keep where teacher_id  = duplicate;
  update public.lessons         set author_id   = keep where author_id   = duplicate;
  update public.reviews         set reviewer_id = keep where reviewer_id = duplicate;

  --------------------------------------------------------- name and address --
  update public.profiles
  set full_name = coalesce(nullif(trim(new_name), ''), full_name),
      email     = coalesce(nullif(trim(new_email), ''), email)
  where id = keep;

  -- The address a child actually logs in with lives in auth.users, so it has to
  -- be changed there too or the new one would be cosmetic only.
  if nullif(trim(new_email), '') is not null then
    update auth.users
    set email = trim(new_email),
        raw_user_meta_data =
          coalesce(raw_user_meta_data, '{}'::jsonb) ||
          jsonb_build_object('full_name', coalesce(nullif(trim(new_name), ''),
                                                   (select full_name from public.profiles where id = keep)))
    where id = keep;
  end if;

  ------------------------------------------------------------ and goodbye ----
  -- Deleting the auth user cascades to its profile. Everything worth keeping
  -- has already been moved above.
  delete from auth.users where id = duplicate;

  return moved;
end;
$$;

revoke all on function public.merge_preview(uuid, uuid)              from public;
revoke all on function public.merge_accounts(uuid, uuid, text, text) from public;
grant execute on function public.merge_preview(uuid, uuid)              to authenticated;
grant execute on function public.merge_accounts(uuid, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';

select 'merge functions installed' as status;
