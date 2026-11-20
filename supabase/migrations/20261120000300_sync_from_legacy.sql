-- =====================================================================
-- EAC Academia v2 · Sincronización public (app actual) → app (v2)
--
-- - Solo LEE las tablas de public; nunca las modifica.
-- - Idempotente: se puede correr muchas veces (ensayo en staging y
--   de nuevo el día del corte) sin duplicar nada.
-- - Conserva los mismos id y matrículas.
-- - Lo que no puede resolver solo lo anota en app.migration_issues.
-- - Tandas: NO se migran (decisión 20 nov 2026).
--
-- Uso:  select * from app.sync_from_legacy();
-- =====================================================================
create or replace function app.sync_from_legacy()
returns table (paso text, filas bigint)
language plpgsql security definer set search_path = app, public, extensions as $$
declare n bigint;
begin
  -- -------------------------------------------------------------------
  -- 1. Estudiantes → profiles
  -- -------------------------------------------------------------------
  drop table if exists tmp_al, tmp_mail_dup;
  create temporary table tmp_al on commit drop as
  select a.id,
         nullif(trim(a.matricula), '') as mat,
         nullif(trim(a.nombre), '') as nombre_min,
         nullif(trim(a."Nombre"), '') as nombre_may,
         nullif(trim(a.apellidos), '') as apellidos,
         nullif(trim(a.telefono), '') as telefono,
         nullif(right(regexp_replace(coalesce(a.telefono, ''), '\D', '', 'g'), 10), '') as tel10,
         lower(coalesce(
           case when trim(a.correo) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then trim(a.correo) end,
           case when trim(a.email)  ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then trim(a.email)  end
         )) as mail,
         nullif(trim(a.password), '') as pw,
         a.fecha_nacimiento, nullif(trim(a.cp), '') as cp, nullif(trim(a.estado), '') as estado,
         nullif(trim(a.pais), '') as pais, nullif(trim(a.direccion), '') as direccion,
         coalesce(a.primer_ingreso, true) as primer_ingreso
  from public.alumnos a;

  -- Correo repetido: lo conserva el registro con id menor; los demás quedan sin correo.
  create temporary table tmp_mail_dup on commit drop as
  select id from (
    select id, row_number() over (partition by mail order by id) as rn from tmp_al where mail is not null
  ) x where rn > 1;

  insert into app.migration_issues (entity, legacy_id, issue, detail)
  select 'alumnos', t.id::text, 'correo_repetido', jsonb_build_object('correo', t.mail)
  from tmp_al t join tmp_mail_dup d using (id)
  on conflict do nothing;

  insert into app.migration_issues (entity, legacy_id, issue, detail)
  select 'alumnos', id::text, 'nombre_distinto', jsonb_build_object('nombre', nombre_min, 'Nombre', nombre_may, 'usado', nombre_min)
  from tmp_al where nombre_min is not null and nombre_may is not null and nombre_min <> nombre_may
  on conflict do nothing;

  insert into app.migration_issues (entity, legacy_id, issue, detail)
  select 'alumnos', t.id::text, 'telefono_compartido', jsonb_build_object('telefono10', t.tel10)
  from tmp_al t
  where length(t.tel10) = 10 and (select count(*) from tmp_al t2 where t2.tel10 = t.tel10) > 1
  on conflict do nothing;

  insert into app.profiles as p (id, matricula, role, first_name, last_name, phone, phone10, email,
                                 birth_date, postal_code, state, country, address,
                                 must_change_password, first_login, source)
  select t.id,
         coalesce(t.mat, (select pr.matricula from app.profiles pr where pr.id = t.id), nextval('app.matricula_seq')::text),
         'student',
         coalesce(t.nombre_min, t.nombre_may),
         t.apellidos, t.telefono, t.tel10,
         case when d.id is null then t.mail end,
         t.fecha_nacimiento, t.cp, t.estado, t.pais, t.direccion,
         coalesce(length(t.pw) < 6, true),
         t.primer_ingreso,
         'migracion'
  from tmp_al t left join tmp_mail_dup d using (id)
  on conflict (id) do update set
    -- Los datos de la app actual mandan mientras siga en uso, excepto lo que
    -- solo existe en v2 (rol, auth_user_id, email verificado).
    matricula   = coalesce(excluded.matricula, p.matricula),
    first_name  = excluded.first_name,
    last_name   = excluded.last_name,
    phone       = excluded.phone,
    phone10     = excluded.phone10,
    email       = case when p.email_verified then p.email else excluded.email end,
    birth_date  = excluded.birth_date,
    postal_code = excluded.postal_code,
    state       = excluded.state,
    country     = excluded.country,
    address     = excluded.address,
    must_change_password = case when p.auth_user_id is null then excluded.must_change_password else p.must_change_password end;
  get diagnostics n = row_count; paso := '1. Estudiantes (profiles)'; filas := n; return next;

  -- Contraseñas: se guardan cifradas con bcrypt solo si cambiaron.
  insert into app.legacy_credentials (profile_id, password_bcrypt)
  select t.id, crypt(t.pw, gen_salt('bf', 10)) from tmp_al t where t.pw is not null
  on conflict (profile_id) do update set password_bcrypt = excluded.password_bcrypt, migrated_at = null
  where app.legacy_credentials.password_bcrypt <> crypt(
    (select t2.pw from tmp_al t2 where t2.id = app.legacy_credentials.profile_id),
    app.legacy_credentials.password_bcrypt);
  get diagnostics n = row_count; paso := '1b. Contraseñas cifradas (nuevas o cambiadas)'; filas := n; return next;

  -- -------------------------------------------------------------------
  -- 2. Cursos y grupos
  -- -------------------------------------------------------------------
  insert into app.courses as c (id, title, description, what_you_learn, duration_text, cover_url, manual_pdf_url,
                                price, modality, required_classes, is_visible, is_upcoming, is_featured, created_at)
  select k.id, k."Nombre_curso", k.descripcion, k.lo_que_aprenderas, k.duracion,
         coalesce(nullif(k.portada_url, ''), nullif(k.imagen, ''), nullif(k.foto_url, '')),
         k.manual_pdf_url, coalesce(k.precio, 0), k.modalidad, k.clases_exigibles,
         coalesce(k.visible_web, true), coalesce(k.proximo, false), coalesce(k.recomendado_marketing, false),
         coalesce(k.created_at, now())
  from public.cursos k
  on conflict (id) do update set
    title = excluded.title, description = excluded.description, what_you_learn = excluded.what_you_learn,
    duration_text = excluded.duration_text, cover_url = excluded.cover_url, manual_pdf_url = excluded.manual_pdf_url,
    price = excluded.price, modality = excluded.modality, required_classes = excluded.required_classes,
    is_visible = excluded.is_visible, is_upcoming = excluded.is_upcoming, is_featured = excluded.is_featured;
  get diagnostics n = row_count; paso := '2. Cursos'; filas := n; return next;

  insert into app.course_groups as g (id, course_id, name, modality, starts_on, ends_on, price_total, enrollment_fee,
                                      installments, frequency, capacity, schedule_text, info_text, whatsapp_url, status)
  select gr.id, gr.curso_id,
         coalesce(nullif(trim(gr.nombre_grupo), ''), nullif(trim(gr.nombre), ''), nullif(trim(gr.grupo), ''), 'Grupo ' || gr.id),
         case when gr.tipo_modalidad in ('en_linea', 'presencial', 'grabado', 'mixto') then gr.tipo_modalidad else 'en_linea' end,
         gr.fecha_inicio, gr.fecha_fin,
         coalesce(nullif(gr.costo_total, 0), gr.costo, 0), coalesce(gr.cuota_inscripcion, 0),
         greatest(coalesce(gr.num_pagos, 1), 1), gr.frecuencia, gr.capacidad,
         coalesce(nullif(trim(gr.horario_texto), ''), nullif(trim(gr.horario), '')),
         gr.info_copiar, gr.enlace_whatsapp, coalesce(gr.estado, 'activo')
  from public.grupos gr
  where gr.curso_id is not null
  on conflict (id) do update set
    course_id = excluded.course_id, name = excluded.name, modality = excluded.modality,
    starts_on = excluded.starts_on, ends_on = excluded.ends_on, price_total = excluded.price_total,
    enrollment_fee = excluded.enrollment_fee, installments = excluded.installments, frequency = excluded.frequency,
    capacity = excluded.capacity, schedule_text = excluded.schedule_text, info_text = excluded.info_text,
    whatsapp_url = excluded.whatsapp_url, status = excluded.status;
  get diagnostics n = row_count; paso := '2b. Grupos'; filas := n; return next;
  -- Nota: grupos.duracion_acceso se ignora a propósito (vigencia permanente).

  -- -------------------------------------------------------------------
  -- 3. Inscripciones (los accesos)
  -- -------------------------------------------------------------------
  insert into app.migration_issues (entity, legacy_id, issue, detail)
  select 'inscripciones', i.id::text,
         case when i.alumno_id !~ '^\s*\d+\s*$' then 'alumno_id_no_numerico'
              when not exists (select 1 from app.profiles p where p.id = trim(i.alumno_id)::bigint) then 'alumno_inexistente'
              when i.grupo_id is null then 'sin_grupo'
              else 'grupo_inexistente' end,
         jsonb_build_object('alumno_id', i.alumno_id, 'curso_id', i.curso_id, 'grupo_id', i.grupo_id,
                            'estatus', coalesce(nullif(i.estatus, ''), nullif(i."Estatus", '')))
  from public.inscripciones i
  where i.alumno_id !~ '^\s*\d+\s*$'
     or not exists (select 1 from app.profiles p where p.id = trim(i.alumno_id)::bigint)
     or i.grupo_id is null
     or not exists (select 1 from app.course_groups g where g.id = i.grupo_id)
  on conflict do nothing;

  -- Duplicados (mismo alumno y grupo): se queda una; si alguna está activa, activa.
  insert into app.enrollments as e (id, profile_id, course_id, group_id, status, drop_reason, source, enrolled_at)
  select distinct on (trim(i.alumno_id)::bigint, i.grupo_id)
         i.id, trim(i.alumno_id)::bigint, g.course_id, i.grupo_id,
         case when lower(coalesce(nullif(i.estatus, ''), nullif(i."Estatus", ''), 'activa')) like 'baja%' then 'baja' else 'activa' end,
         i.motivo_baja, 'migracion',
         coalesce(i.fecha_inscripcion at time zone 'America/Mexico_City', now())
  from public.inscripciones i
  join app.course_groups g on g.id = i.grupo_id
  where i.alumno_id ~ '^\s*\d+\s*$'
    and exists (select 1 from app.profiles p where p.id = trim(i.alumno_id)::bigint)
  order by trim(i.alumno_id)::bigint, i.grupo_id,
           (lower(coalesce(nullif(i.estatus, ''), nullif(i."Estatus", ''), 'activa')) like 'baja%'), i.id
  on conflict (profile_id, group_id) do update set
    status = excluded.status, drop_reason = excluded.drop_reason, course_id = excluded.course_id;
  get diagnostics n = row_count; paso := '3. Inscripciones'; filas := n; return next;

  -- -------------------------------------------------------------------
  -- 4. Pagos y cuotas
  -- -------------------------------------------------------------------
  insert into app.migration_issues (entity, legacy_id, issue, detail)
  select 'pagos', pg.id::text, 'alumno_inexistente',
         jsonb_build_object('alumno_id', pg.alumno_id, 'monto', pg.monto, 'estatus', pg.estatus)
  from public.pagos pg where not exists (select 1 from app.profiles p where p.id = pg.alumno_id)
  on conflict do nothing;

  insert into app.payments as py (id, profile_id, course_id, group_id, amount, amount_received, due_date, paid_on,
                                  status, receipt_url, notes)
  select pg.id, pg.alumno_id,
         coalesce((select c.id from app.courses c where c.id = pg.curso_id), g.course_id),
         g.id,
         pg.monto, coalesce(pg.monto_real, 0), pg.fecha_vencimiento, pg.fecha_pago,
         case lower(trim(coalesce(pg.estatus, 'pendiente')))
           when 'pagado' then 'pagado'
           when 'cancelado' then 'cancelado'
           when 'revision' then 'en_revision'
           when 'revisión' then 'en_revision'
           else 'pendiente' end,
         nullif(trim(pg.comprobante_url), ''), pg.observaciones
  from public.pagos pg
  left join app.course_groups g on g.id = pg.grupo_id
  where exists (select 1 from app.profiles p where p.id = pg.alumno_id)
  on conflict (id) do update set
    course_id = excluded.course_id, group_id = excluded.group_id, amount = excluded.amount,
    amount_received = excluded.amount_received, due_date = excluded.due_date, paid_on = excluded.paid_on,
    receipt_url = excluded.receipt_url, notes = excluded.notes,
    -- Un pago confirmado por Stripe en v2 no se revierte con datos viejos.
    status = case when py.stripe_payment_id is not null then py.status else excluded.status end;
  get diagnostics n = row_count; paso := '4. Pagos'; filas := n; return next;

  -- -------------------------------------------------------------------
  -- 5. Contenido
  -- -------------------------------------------------------------------
  insert into app.lessons as l (id, course_id, title, video_url, position, created_at)
  select x.id, x.curso_id, x.titulo, x.video_url, coalesce(x.orden, 0), x.created_at
  from public.lecciones_lms x where x.curso_id in (select id from app.courses)
  on conflict (id) do update set course_id = excluded.course_id, title = excluded.title,
    video_url = excluded.video_url, position = excluded.position;
  get diagnostics n = row_count; paso := '5. Lecciones'; filas := n; return next;

  insert into app.group_resources as r (id, group_id, title, kind, url, created_at)
  select x.id, x.grupo_id, x.titulo, coalesce(x.tipo, 'video'), x.url, coalesce(x.created_at at time zone 'America/Mexico_City', now())
  from public.recursos x where x.grupo_id in (select id from app.course_groups)
  on conflict (id) do update set group_id = excluded.group_id, title = excluded.title, kind = excluded.kind, url = excluded.url;
  get diagnostics n = row_count; paso := '5b. Recursos de grupo'; filas := n; return next;

  insert into app.live_sessions as s (id, group_id, number, title, starts_at, meet_url, created_at)
  select x.id, x.grupo_id, x.numero_sesion, x.titulo_sesion, x.fecha_hora, x.enlace_meet, coalesce(x.created_at, now())
  from public.sesiones_grupo x where x.grupo_id in (select id from app.course_groups)
  on conflict (id) do update set group_id = excluded.group_id, number = excluded.number, title = excluded.title,
    starts_at = excluded.starts_at, meet_url = excluded.meet_url;
  get diagnostics n = row_count; paso := '5c. Sesiones en vivo'; filas := n; return next;

  -- -------------------------------------------------------------------
  -- 6. Otros
  -- -------------------------------------------------------------------
  insert into app.prospects as pr (id, name, phone, email, course_id, status, notes, created_at)
  select x.id, x.nombre, x.telefono, x.correo,
         case when x.curso_id in (select id from app.courses) then x.curso_id end,
         coalesce(x.estatus, 'Nuevo'), x.notas, x.created_at
  from public.prospectos x
  on conflict (id) do update set name = excluded.name, phone = excluded.phone, email = excluded.email,
    course_id = excluded.course_id, status = excluded.status, notes = excluded.notes;
  get diagnostics n = row_count; paso := '6. Prospectos'; filas := n; return next;

  insert into app.announcements as an (id, title, message, is_active, updated_at)
  select x.id, x.titulo, x.mensaje, coalesce(x.activo, true), x.fecha_actualizacion from public.configuracion_anuncios x
  on conflict (id) do update set title = excluded.title, message = excluded.message,
    is_active = excluded.is_active, updated_at = excluded.updated_at;
  get diagnostics n = row_count; paso := '6b. Avisos'; filas := n; return next;

  insert into app.access_log (id, profile_id, accessed_at)
  select x.id, x.alumno_id, x.fecha_acceso from public.historial_accesos x
  where x.alumno_id in (select id from app.profiles)
  on conflict (id) do nothing;
  get diagnostics n = row_count; paso := '6c. Historial de accesos (nuevos)'; filas := n; return next;

  insert into app.reviews (id, profile_id, course_id, stars, comment, created_at)
  select x.id, x.alumno_id, x.curso_id, x.estrellas, x.comentario, x.created_at from public.valoraciones x
  where (x.alumno_id is null or x.alumno_id in (select id from app.profiles))
    and (x.curso_id is null or x.curso_id in (select id from app.courses))
  on conflict (id) do nothing;
  get diagnostics n = row_count; paso := '6d. Valoraciones (nuevas)'; filas := n; return next;

  -- -------------------------------------------------------------------
  -- 7. Secuencias por encima de los ids migrados
  -- -------------------------------------------------------------------
  perform setval('app.profiles_id_seq',       greatest((select coalesce(max(id), 0) from app.profiles) + 1, 100000), false);
  perform setval('app.courses_id_seq',        greatest((select coalesce(max(id), 0) from app.courses) + 1, 1000), false);
  perform setval('app.course_groups_id_seq',  greatest((select coalesce(max(id), 0) from app.course_groups) + 1, 1000), false);
  perform setval('app.enrollments_id_seq',    greatest((select coalesce(max(id), 0) from app.enrollments) + 1, 100000), false);
  perform setval('app.payments_id_seq',       greatest((select coalesce(max(id), 0) from app.payments) + 1, 100000), false);
  perform setval('app.group_resources_id_seq',greatest((select coalesce(max(id), 0) from app.group_resources) + 1, 10000), false);
  perform setval('app.live_sessions_id_seq',  greatest((select coalesce(max(id), 0) from app.live_sessions) + 1, 10000), false);
  perform setval('app.prospects_id_seq',      greatest((select coalesce(max(id), 0) from app.prospects) + 1, 10000), false);
  perform setval('app.access_log_id_seq',     greatest((select coalesce(max(id), 0) from app.access_log) + 1, 1000000), false);
  perform setval('app.matricula_seq', greatest(
    (select coalesce(max(matricula::bigint), 0) from app.profiles where matricula ~ '^\d+$') + 1, 10000), false);

  paso := '7. Problemas para revisión manual (pendientes)';
  filas := (select count(*) from app.migration_issues where not resolved); return next;
end $$;

revoke all on function app.sync_from_legacy() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Validación: compara conteos entre public y app (debe salir todo "ok").
-- Uso: select * from app.validate_migration();
-- ---------------------------------------------------------------------
create or replace function app.validate_migration()
returns table (chequeo text, en_app_actual bigint, en_v2 bigint, resultado text)
language sql stable security definer set search_path = app, public as $$
  with c as (
    select 'Estudiantes' as chequeo, (select count(*) from public.alumnos) as a, (select count(*) from app.profiles where source = 'migracion') as b, 0 as tolerancia
    union all
    select 'Estudiantes con acceso activo',
      (select count(distinct trim(i.alumno_id)::bigint) from public.inscripciones i
         where i.alumno_id ~ '^\s*\d+\s*$' and lower(coalesce(nullif(i.estatus, ''), nullif(i."Estatus", ''), 'activa')) not like 'baja%'
           and exists (select 1 from public.alumnos al where al.id = trim(i.alumno_id)::bigint)
           and exists (select 1 from public.grupos g where g.id = i.grupo_id)),
      (select count(distinct profile_id) from app.enrollments where status = 'activa'), 0
    union all
    select 'Pares estudiante-grupo con acceso activo',
      (select count(*) from (select distinct trim(i.alumno_id)::bigint, i.grupo_id from public.inscripciones i
         where i.alumno_id ~ '^\s*\d+\s*$' and lower(coalesce(nullif(i.estatus, ''), nullif(i."Estatus", ''), 'activa')) not like 'baja%'
           and exists (select 1 from public.alumnos al where al.id = trim(i.alumno_id)::bigint)
           and exists (select 1 from public.grupos g where g.id = i.grupo_id)) x),
      (select count(*) from app.enrollments where status = 'activa'), 0
    union all
    select 'Cursos', (select count(*) from public.cursos), (select count(*) from app.courses), 0
    union all
    select 'Grupos', (select count(*) from public.grupos where curso_id is not null), (select count(*) from app.course_groups), 0
    union all
    select 'Pagos de estudiantes existentes',
      (select count(*) from public.pagos pg where exists (select 1 from public.alumnos al where al.id = pg.alumno_id)),
      (select count(*) from app.payments), 0
    union all
    select 'Cuotas pendientes de estudiantes existentes',
      (select count(*) from public.pagos pg where lower(coalesce(pg.estatus, 'pendiente')) not in ('pagado', 'cancelado', 'revision', 'revisión')
         and exists (select 1 from public.alumnos al where al.id = pg.alumno_id)),
      (select count(*) from app.payments where status = 'pendiente'), 0
    union all
    select 'Recursos', (select count(*) from public.recursos), (select count(*) from app.group_resources), 0
    union all
    select 'Sesiones en vivo', (select count(*) from public.sesiones_grupo), (select count(*) from app.live_sessions), 0
    union all
    select 'Lecciones', (select count(*) from public.lecciones_lms), (select count(*) from app.lessons), 0
    union all
    select 'Estudiantes con contraseña cifrada',
      (select count(*) from public.alumnos where nullif(trim(password), '') is not null),
      (select count(*) from app.legacy_credentials), 0
  )
  select chequeo, a, b, case when a = b then 'ok' else 'REVISAR' end from c
$$;
revoke all on function app.validate_migration() from public, anon, authenticated;
