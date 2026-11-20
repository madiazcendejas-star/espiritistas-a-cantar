-- =====================================================================
-- EAC Academia v2 · Un estudiante ve los cursos y grupos en los que está
-- inscrito aunque el curso ya no esté visible en el catálogo público.
-- Las verificaciones van en funciones security definer para que los
-- visitantes sin sesión (anon) no necesiten permiso sobre enrollments.
-- =====================================================================
create or replace function app.is_enrolled_in_course(p_course bigint) returns boolean
language sql stable security definer set search_path = app, public as $$
  select exists (select 1 from app.enrollments e where e.course_id = p_course and e.profile_id = app.current_profile_id())
$$;

create or replace function app.is_enrolled_in_group(p_group bigint) returns boolean
language sql stable security definer set search_path = app, public as $$
  select exists (select 1 from app.enrollments e where e.group_id = p_group and e.profile_id = app.current_profile_id())
$$;

revoke execute on function app.is_enrolled_in_course(bigint), app.is_enrolled_in_group(bigint) from public;
grant execute on function app.is_enrolled_in_course(bigint), app.is_enrolled_in_group(bigint) to anon, authenticated, service_role;

drop policy if exists courses_enrolled_select on app.courses;
create policy courses_enrolled_select on app.courses for select using (app.is_enrolled_in_course(id));

drop policy if exists groups_enrolled_select on app.course_groups;
create policy groups_enrolled_select on app.course_groups for select using (app.is_enrolled_in_group(id));
