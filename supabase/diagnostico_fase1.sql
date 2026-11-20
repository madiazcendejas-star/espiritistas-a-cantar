-- =====================================================================
-- EAC Academia · Diagnóstico de datos para la migración (Fase 1)
-- SOLO LECTURA: no modifica nada. Devuelve únicamente conteos,
-- nunca nombres, teléfonos, correos ni contraseñas.
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- Copia la tabla de resultados (indicador | valor) y compártela.
-- =====================================================================
with
al as (
  select a.*,
         nullif(trim(a.matricula), '') as mat,
         nullif(right(regexp_replace(coalesce(a.telefono, ''), '\D', '', 'g'), 10), '') as tel10,
         nullif(lower(trim(coalesce(
           nullif(nullif(trim(a.correo), ''), 'EMPTY'),
           nullif(nullif(trim(a.email), ''), 'EMPTY')
         ))), '') as mail
  from public.alumnos a
),
ins as (
  select i.*,
         (i.alumno_id ~ '^\s*\d+\s*$') as id_numerico,
         case when i.alumno_id ~ '^\s*\d+\s*$' then trim(i.alumno_id)::bigint end as alumno_bigint,
         lower(trim(coalesce(nullif(i.estatus, ''), nullif(i."Estatus", ''), '(vacío)'))) as est
  from public.inscripciones i
)
select orden, indicador, valor from (
  -- 1. Tamaño de cada tabla
  select 100 as orden, 'Tabla alumnos · filas' as indicador, (select count(*) from public.alumnos)::text as valor
  union all select 101, 'Tabla cursos · filas', (select count(*) from public.cursos)::text
  union all select 102, 'Tabla grupos · filas', (select count(*) from public.grupos)::text
  union all select 103, 'Tabla inscripciones · filas', (select count(*) from public.inscripciones)::text
  union all select 104, 'Tabla pagos · filas', (select count(*) from public.pagos)::text
  union all select 105, 'Tabla recursos · filas', (select count(*) from public.recursos)::text
  union all select 106, 'Tabla lecciones_lms · filas', (select count(*) from public.lecciones_lms)::text
  union all select 107, 'Tabla sesiones_grupo · filas', (select count(*) from public.sesiones_grupo)::text
  union all select 108, 'Tabla valoraciones · filas', (select count(*) from public.valoraciones)::text
  union all select 109, 'Tabla prospectos · filas', (select count(*) from public.prospectos)::text
  union all select 110, 'Tabla historial_accesos · filas', (select count(*) from public.historial_accesos)::text
  union all select 111, 'Tabla citas_presenciales · filas', (select count(*) from public.citas_presenciales)::text
  union all select 112, 'Tabla sesiones_presenciales_libres · filas', (select count(*) from public.sesiones_presenciales_libres)::text
  union all select 113, 'Tabla configuracion_anuncios · filas', (select count(*) from public.configuracion_anuncios)::text
  union all select 114, 'Tabla cursos_lms · filas', (select count(*) from public.cursos_lms)::text
  union all select 115, 'Tabla accesos_alumnos · filas', (select count(*) from public.accesos_alumnos)::text
  union all select 116, 'Cuentas en auth.users (Supabase Auth)', (select count(*) from auth.users)::text

  -- 2. Calidad de datos de estudiantes (identidad para el login)
  union all select 200, 'Alumnos sin matrícula', (select count(*) from al where mat is null)::text
  union all select 201, 'Matrículas repetidas (valores)', (select count(*) from (select mat from al where mat is not null group by mat having count(*) > 1) x)::text
  union all select 202, 'Matrícula más alta (numérica)', (select coalesce(max(mat::bigint)::text, '(ninguna)') from al where mat ~ '^\d+$')
  union all select 203, 'Matrículas no numéricas', (select count(*) from al where mat is not null and mat !~ '^\d+$')::text
  union all select 204, 'Alumnos sin teléfono válido (10 dígitos)', (select count(*) from al where tel10 is null or length(tel10) < 10)::text
  union all select 205, 'Teléfonos repetidos entre alumnos (valores)', (select count(*) from (select tel10 from al where length(tel10) = 10 group by tel10 having count(*) > 1) x)::text
  union all select 206, 'Alumnos sin correo válido', (select count(*) from al where mail is null or mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')::text
  union all select 207, 'Correos repetidos entre alumnos (valores)', (select count(*) from (select mail from al where mail is not null group by mail having count(*) > 1) x)::text
  union all select 208, 'Alumnos con correo y email distintos', (select count(*) from al where nullif(trim(correo), '') is not null and nullif(trim(email), '') is not null and lower(trim(correo)) <> lower(trim(email)))::text
  union all select 209, 'Alumnos sin contraseña propia (usan la de por defecto)', (select count(*) from al where nullif(trim(password), '') is null)::text
  union all select 210, 'Alumnos con contraseña de menos de 6 caracteres', (select count(*) from al where length(trim(password)) between 1 and 5)::text
  union all select 211, 'Alumnos sin teléfono NI correo (no podrían entrar)', (select count(*) from al where (tel10 is null or length(tel10) < 10) and mail is null and mat is null)::text
  union all select 212, 'Alumnos con "Nombre" y "nombre" distintos', (select count(*) from al where nullif(trim("Nombre"), '') is not null and nullif(trim(nombre), '') is not null and trim("Nombre") <> trim(nombre))::text
  union all select 213, 'Alumnos sin ninguna inscripción', (select count(*) from al where not exists (select 1 from ins where ins.alumno_bigint = al.id))::text
  union all select 214, 'Alumnos con al menos una inscripción activa', (select count(distinct alumno_bigint) from ins where est in ('activa', 'activo'))::text
  union all select 215, 'Alumnos con correo que ya existe en auth.users', (select count(*) from al where mail is not null and exists (select 1 from auth.users u where lower(u.email) = al.mail))::text

  -- 3. Inscripciones (los accesos que NO se pueden perder)
  union all select 300, 'Inscripciones con alumno_id no numérico', (select count(*) from ins where not id_numerico)::text
  union all select 301, 'Inscripciones cuyo alumno no existe', (select count(*) from ins where id_numerico and not exists (select 1 from public.alumnos a where a.id = ins.alumno_bigint))::text
  union all select 302, 'Inscripciones cuyo curso no existe', (select count(*) from ins where not exists (select 1 from public.cursos c where c.id = ins.curso_id))::text
  union all select 303, 'Inscripciones sin grupo', (select count(*) from ins where grupo_id is null)::text
  union all select 304, 'Inscripciones cuyo grupo no existe', (select count(*) from ins where grupo_id is not null and not exists (select 1 from public.grupos g where g.id = ins.grupo_id))::text
  union all select 305, 'Inscripciones con grupo de otro curso', (select count(*) from ins join public.grupos g on g.id = ins.grupo_id where g.curso_id is distinct from ins.curso_id)::text
  union all select 306, 'Inscripciones duplicadas (mismo alumno y grupo)', (select coalesce(sum(n - 1), 0) from (select count(*) n from ins where id_numerico group by alumno_bigint, curso_id, grupo_id having count(*) > 1) x)::text
  union all select 307, 'Inscripciones con "Estatus" y "estatus" distintos', (select count(*) from public.inscripciones where nullif("Estatus", '') is not null and nullif(estatus, '') is not null and lower("Estatus") <> lower(estatus))::text
  union all select 308, 'Valores de estatus de inscripción (valor: cantidad)', (select string_agg(est || ': ' || n, ' · ' order by n desc) from (select est, count(*) n from ins group by est) x)

  -- 4. Grupos y vigencia de accesos
  union all select 400, 'Valores de grupos.duracion_acceso', (select string_agg(coalesce(duracion_acceso, '(vacío)') || ': ' || n, ' · ' order by n desc) from (select duracion_acceso, count(*) n from public.grupos group by duracion_acceso) x)
  union all select 401, 'Valores de grupos.estado', (select string_agg(coalesce(estado, '(vacío)') || ': ' || n, ' · ' order by n desc) from (select estado, count(*) n from public.grupos group by estado) x)
  union all select 402, 'Valores de grupos.tipo_modalidad', (select string_agg(coalesce(tipo_modalidad, '(vacío)') || ': ' || n, ' · ' order by n desc) from (select tipo_modalidad, count(*) n from public.grupos group by tipo_modalidad) x)
  union all select 403, 'Grupos con pagos en parcialidades (num_pagos > 1)', (select count(*) from public.grupos where num_pagos > 1)::text
  union all select 404, 'Grupos sin curso', (select count(*) from public.grupos where curso_id is null)::text
  union all select 405, 'Cursos con fecha_caducidad', (select count(*) from public.cursos where fecha_caducidad is not null)::text
  union all select 406, 'Cursos con fecha_caducidad ya vencida', (select count(*) from public.cursos where fecha_caducidad < current_date)::text
  union all select 407, 'Recursos sin grupo', (select count(*) from public.recursos where grupo_id is null)::text
  union all select 408, 'Lecciones LMS sin curso', (select count(*) from public.lecciones_lms where curso_id is null)::text
  union all select 409, 'Sesiones en vivo futuras', (select count(*) from public.sesiones_grupo where fecha_hora >= now())::text

  -- 5. Pagos
  union all select 500, 'Valores de pagos.estatus', (select string_agg(coalesce(estatus, '(vacío)') || ': ' || n, ' · ' order by n desc) from (select estatus, count(*) n from public.pagos group by estatus) x)
  union all select 501, 'Pagos pendientes con fecha de vencimiento futura', (select count(*) from public.pagos where lower(coalesce(estatus, '')) like 'pendiente%' and fecha_vencimiento >= current_date)::text
  union all select 502, 'Pagos con comprobante adjunto', (select count(*) from public.pagos where nullif(trim(comprobante_url), '') is not null)::text
  union all select 503, 'Pagos cuyo alumno no existe', (select count(*) from public.pagos p where not exists (select 1 from public.alumnos a where a.id = p.alumno_id))::text

  -- 6. Tandas (se van a retirar: hay que saber si hay compromisos vivos)
  union all select 600, 'tandas_misas vigentes (fecha_fin hoy o después)', (select count(*) from public.tandas_misas where fecha_fin >= current_date)::text
  union all select 601, 'pagos_tandas pendientes', (select count(*) from public.pagos_tandas where lower(coalesce(estatus, '')) like 'pendiente%')::text
  union all select 602, 'alumno_tandas activas', (select count(*) from public.alumno_tandas where lower(coalesce(estado, '')) = 'activa')::text
  union all select 603, 'tanda_pagos pendientes', (select count(*) from public.tanda_pagos where lower(coalesce(estado, '')) like 'pendiente%')::text

  -- 7. LMS anterior (cursos_lms / accesos_alumnos)
  union all select 700, 'accesos_alumnos cuyo correo no está en alumnos', (select count(*) from public.accesos_alumnos x where not exists (select 1 from al where al.mail = lower(trim(x.correo_alumno))))::text

  -- 8. Tablas que usa el código pero no aparecen en el esquema
  union all select 800, '¿Existe la tabla comprobantes?', case when to_regclass('public.comprobantes') is null then 'no' else 'sí' end
  union all select 801, '¿Existe la tabla horarios_clases?', case when to_regclass('public.horarios_clases') is null then 'no' else 'sí' end
  union all select 802, '¿Existe la tabla estudiantes?', case when to_regclass('public.estudiantes') is null then 'no' else 'sí' end

  -- 9. Seguridad: tablas con RLS activado
  union all select 900, 'Tablas de public con RLS activado', (select count(*) from pg_tables where schemaname = 'public' and rowsecurity)::text || ' de ' || (select count(*) from pg_tables where schemaname = 'public')::text
) r
order by orden;
