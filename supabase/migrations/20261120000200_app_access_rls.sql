-- =====================================================================
-- EAC Academia v2 · Regla de acceso y seguridad por filas (RLS)
-- =====================================================================

-- Perfil del usuario que hace la petición (null si no hay sesión).
create or replace function app.current_profile_id() returns bigint
language sql stable security definer set search_path = app, public as $$
  select id from app.profiles where auth_user_id = auth.uid()
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = app, public as $$
  select exists (select 1 from app.profiles where auth_user_id = auth.uid() and role = 'admin')
$$;

-- Regla de acceso heredada de la app actual:
-- inscripción activa en el grupo y ninguna cuota de ese grupo vencida.
-- La vigencia es permanente (no caduca con el tiempo).
create or replace function app.group_access_state(p_profile bigint, p_group bigint) returns text
language sql stable security definer set search_path = app, public as $$
  select case
    when not exists (
      select 1 from app.enrollments e
      where e.profile_id = p_profile and e.group_id = p_group and e.status = 'activa'
    ) then 'sin_acceso'
    when exists (
      select 1 from app.payments p
      where p.profile_id = p_profile and p.group_id = p_group
        and p.status = 'pendiente' and p.due_date < (now() at time zone 'America/Mexico_City')::date
    ) then 'pausado'
    else 'activo'
  end
$$;

create or replace function app.can_access_group(p_group bigint) returns boolean
language sql stable security definer set search_path = app, public as $$
  select app.is_admin() or app.group_access_state(app.current_profile_id(), p_group) = 'activo'
$$;

create or replace function app.my_access_state(p_group bigint) returns text
language sql stable security definer set search_path = app, public as $$
  select app.group_access_state(app.current_profile_id(), p_group)
$$;

-- Vista para el panel del estudiante: sus grupos con el estado de acceso.
create or replace view app.my_groups with (security_invoker = true) as
  select e.group_id, e.course_id, e.status as enrollment_status,
         app.my_access_state(e.group_id) as access_state
  from app.enrollments e
  where e.profile_id = app.current_profile_id();

-- ---------------------------------------------------------------------
-- RLS: todo cerrado por defecto; se abre solo lo necesario.
-- El panel de Administración y los procesos del servidor usan la
-- service_role key, que no pasa por RLS.
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','legacy_credentials','courses','course_groups','enrollments','payments',
                           'lessons','group_resources','live_sessions','lesson_progress','attendance',
                           'prospects','announcements','access_log','reviews','migration_issues']
  loop
    execute format('alter table app.%I enable row level security', t);
  end loop;
end $$;

-- Perfil propio
drop policy if exists profiles_self_select on app.profiles;
create policy profiles_self_select on app.profiles for select using (auth_user_id = auth.uid() or app.is_admin());

-- Catálogo público (cursos visibles y sus grupos)
drop policy if exists courses_public_select on app.courses;
create policy courses_public_select on app.courses for select using (is_visible or app.is_admin());
drop policy if exists groups_public_select on app.course_groups;
create policy groups_public_select on app.course_groups for select
  using (app.is_admin() or exists (select 1 from app.courses c where c.id = course_id and c.is_visible));

-- Lo propio del estudiante
drop policy if exists enrollments_self_select on app.enrollments;
create policy enrollments_self_select on app.enrollments for select using (profile_id = app.current_profile_id() or app.is_admin());
drop policy if exists payments_self_select on app.payments;
create policy payments_self_select on app.payments for select using (profile_id = app.current_profile_id() or app.is_admin());
drop policy if exists progress_self_all on app.lesson_progress;
create policy progress_self_all on app.lesson_progress for all
  using (profile_id = app.current_profile_id()) with check (profile_id = app.current_profile_id());
drop policy if exists attendance_self_select on app.attendance;
create policy attendance_self_select on app.attendance for select using (profile_id = app.current_profile_id() or app.is_admin());

-- Contenido: solo con acceso activo al grupo (o a algún grupo del curso)
drop policy if exists lessons_access_select on app.lessons;
create policy lessons_access_select on app.lessons for select using (
  app.is_admin() or exists (
    select 1 from app.enrollments e
    where e.course_id = lessons.course_id and e.profile_id = app.current_profile_id()
      and app.can_access_group(e.group_id)
  )
);
drop policy if exists resources_access_select on app.group_resources;
create policy resources_access_select on app.group_resources for select using (app.can_access_group(group_id));
drop policy if exists sessions_access_select on app.live_sessions;
create policy sessions_access_select on app.live_sessions for select using (app.can_access_group(group_id));

-- Avisos activos visibles para cualquier sesión iniciada
drop policy if exists announcements_select on app.announcements;
create policy announcements_select on app.announcements for select using (is_active and auth.uid() is not null);

-- Sin políticas (solo servidor / Administración vía service_role):
-- legacy_credentials, prospects, access_log, reviews (escritura), migration_issues.

-- Las funciones nacen ejecutables por PUBLIC: se cierran y se abren solo las necesarias.
revoke execute on all functions in schema app from public;

grant usage on schema app to anon, authenticated;
grant select on app.courses, app.course_groups to anon, authenticated;
grant select on app.profiles, app.enrollments, app.payments, app.lessons, app.group_resources,
                app.live_sessions, app.attendance, app.announcements, app.my_groups to authenticated;
grant select, insert, update on app.lesson_progress to authenticated;
grant execute on function app.current_profile_id(), app.is_admin(), app.can_access_group(bigint), app.my_access_state(bigint) to anon, authenticated;

-- Procesos del servidor y panel de Administración (service_role, no pasa por RLS)
grant usage on schema app to service_role;
grant all on all tables in schema app to service_role;
grant all on all sequences in schema app to service_role;
grant execute on all functions in schema app to service_role;
alter default privileges in schema app grant all on tables to service_role;
alter default privileges in schema app grant all on sequences to service_role;
