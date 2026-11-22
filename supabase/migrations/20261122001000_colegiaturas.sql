-- =====================================================================
-- EAC Academia v2 · Colegiaturas recurrentes (semanal, quincenal, mensual)
--
-- - course_groups.recurrence: si tiene valor, el grupo se cobra por periodo
--   (price_total = monto de cada periodo) sin número fijo de pagos.
-- - app.generar_colegiaturas(): crea la siguiente cuota de cada inscripción
--   activa unos días antes de que venza. Se detiene en la fecha de fin del
--   grupo (si tiene) o cuando la persona se da de baja. La llama un cron diario.
-- - Tolerancia: el acceso se pausa N días después del vencimiento
--   (ajuste «dias_tolerancia», 3 por defecto). Aplica a todas las cuotas.
-- =====================================================================

alter table app.course_groups add column if not exists recurrence text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'course_groups_recurrence_chk') then
    alter table app.course_groups add constraint course_groups_recurrence_chk
      check (recurrence is null or recurrence in ('semanal', 'quincenal', 'mensual'));
  end if;
end $$;

insert into app.settings (key, value) values ('dias_tolerancia', '3') on conflict (key) do nothing;

-- Regla de acceso con días de tolerancia
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
        and p.status = 'pendiente'
        and p.due_date < (now() at time zone 'America/Mexico_City')::date
                         - coalesce((select (value #>> '{}')::int from app.settings where key = 'dias_tolerancia'), 0)
    ) then 'pausado'
    else 'activo'
  end
$$;

create or replace function app.siguiente_periodo(p_fecha date, p_recurrence text) returns date
language sql immutable as $$
  select case p_recurrence
    when 'semanal' then p_fecha + 7
    when 'quincenal' then p_fecha + 15
    else (p_fecha + interval '1 month')::date
  end
$$;

-- Genera las cuotas que vencen dentro de los próximos p_anticipacion días.
create or replace function app.generar_colegiaturas(p_hoy date default null, p_anticipacion int default 5)
returns table (payment_id bigint, profile_id bigint, group_id bigint, amount numeric, due_date date)
language plpgsql security definer set search_path = app, public as $$
declare
  v_hoy   date := coalesce(p_hoy, (now() at time zone 'America/Mexico_City')::date);
  r       record;
  v_next  date;
  v_last  date;
  v_n     int;
  v_id    bigint;
begin
  for r in
    select e.profile_id as pid, e.enrolled_at, g.id as gid, g.course_id, g.price_total, g.recurrence, g.ends_on
    from app.enrollments e
    join app.course_groups g on g.id = e.group_id
    where e.status = 'activa' and g.recurrence is not null and g.price_total > 0
      and (g.ends_on is null or g.ends_on >= v_hoy)
  loop
    select max(p.due_date) into v_last from app.payments p
      where p.profile_id = r.pid and p.group_id = r.gid and p.status <> 'cancelado' and p.due_date is not null;
    v_next := case when v_last is null then (r.enrolled_at at time zone 'America/Mexico_City')::date
                   else app.siguiente_periodo(v_last, r.recurrence) end;
    v_n := 0;
    while v_next <= v_hoy + p_anticipacion and (r.ends_on is null or v_next <= r.ends_on) and v_n < 24 loop
      v_id := nextval('app.payments_id_seq');
      insert into app.payments (id, profile_id, course_id, group_id, amount, due_date, status, notes)
      values (v_id, r.pid, r.course_id, r.gid, r.price_total, v_next, 'pendiente', 'Colegiatura ' || r.recurrence);
      payment_id := v_id; profile_id := r.pid; group_id := r.gid; amount := r.price_total; due_date := v_next;
      return next;
      v_next := app.siguiente_periodo(v_next, r.recurrence);
      v_n := v_n + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function app.generar_colegiaturas(date, int) from public, anon, authenticated;
grant execute on function app.generar_colegiaturas(date, int) to service_role;
grant execute on function app.siguiente_periodo(date, text) to service_role;
