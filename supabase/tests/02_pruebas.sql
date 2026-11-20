-- Pruebas automáticas de la migración y de la seguridad (RLS).
-- Cada prueba lanza un error si falla. Correr después de app.sync_from_legacy().
\set ON_ERROR_STOP on

create schema if not exists tests;
create or replace function tests.check(cond boolean, nombre text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLÓ: %', nombre; end if;
  raise notice 'ok  %', nombre;
end $$;

-- ---------- Migración de datos ----------
select tests.check((select count(*) = 0 from app.validate_migration() where resultado <> 'ok'), 'validate_migration sin diferencias');
select tests.check((select matricula from app.profiles where id = 2) = 'EAC-012', 'matrícula no numérica se conserva');
select tests.check((select matricula from app.profiles where id = 3) = '10000', 'alumno sin matrícula recibe 10000 (siguiente a 9619)');
select tests.check((select email from app.profiles where id = 2) is null, 'correo EMPTY queda vacío');
select tests.check((select email from app.profiles where id = 3) = 'jorge@correo.mx', 'correo repetido: lo conserva el id menor');
select tests.check((select email from app.profiles where id = 4) is null, 'correo repetido: el otro queda sin correo');
select tests.check((select email from app.profiles where id = 5) = 'luis@correo.mx', 'correo tomado de la columna email');
select tests.check((select first_name from app.profiles where id = 4) = 'Anita', 'nombre: se usa la columna nombre');
select tests.check((select phone10 from app.profiles where id = 3) = '5512345678', 'teléfono normalizado a 10 dígitos');
select tests.check((select must_change_password from app.profiles where id = 2), 'contraseña corta obliga a cambiarla');
select tests.check(not (select must_change_password from app.profiles where id = 1), 'contraseña válida no obliga a cambiarla');
select tests.check((select password_bcrypt = extensions.crypt('Luna2026', password_bcrypt) from app.legacy_credentials where profile_id = 1), 'contraseña cifrada con bcrypt verificable');
select tests.check((select status from app.enrollments where profile_id = 5 and group_id = 11) = 'activa', 'duplicado con baja y activa queda activa');
select tests.check((select count(*) from app.enrollments where profile_id = 4 and group_id = 12) = 1, 'inscripción duplicada queda una');
select tests.check((select status from app.payments where id = 503) = 'en_revision', 'estatus Revision → en_revision');
select tests.check((select receipt_url from app.payments where id = 503) is not null, 'comprobante histórico se conserva');
select tests.check(not exists (select 1 from app.payments where id = 504), 'pago de alumno inexistente no se migra');
select tests.check((select count(*) from app.migration_issues where issue = 'alumno_inexistente') = 2, 'huérfanos registrados para revisión');
select tests.check((select count(*) from app.migration_issues where issue = 'telefono_compartido') = 2, 'teléfonos compartidos registrados');
select tests.check(to_regclass('app.tandas_misas') is null, 'tandas no se migran');
select tests.check((select count(*) from public.alumnos) = 6 and (select count(*) from public.inscripciones) = 9, 'tablas public intactas');

-- ---------- Regla de acceso ----------
select tests.check(app.group_access_state(1, 10) = 'activo', 'cuota futura: acceso activo');
select tests.check(app.group_access_state(2, 10) = 'pausado', 'cuota vencida: acceso pausado');
select tests.check(app.group_access_state(3, 11) = 'sin_acceso', 'baja: sin acceso');
select tests.check(app.group_access_state(6, 10) = 'sin_acceso', 'sin inscripción: sin acceso');

-- ---------- Idempotencia y cambios en la app actual ----------
update public.alumnos set password = 'NuevaClave1' where id = 1;
update public.inscripciones set estatus = 'baja' where id = 102;
select count(*) from app.sync_from_legacy();
select tests.check((select password_bcrypt = extensions.crypt('NuevaClave1', password_bcrypt) from app.legacy_credentials where profile_id = 1), 'cambio de contraseña en app actual se refleja');
select tests.check((select status from app.enrollments where profile_id = 2 and group_id = 10) = 'baja', 'baja en app actual se refleja');
select tests.check((select count(*) from app.profiles) = 6 and (select count(*) from app.enrollments) = 6, 'segunda sincronización no duplica');
select tests.check((select matricula from app.profiles where id = 3) = '10000', 'matrícula asignada se mantiene entre corridas');

-- ---------- Seguridad (RLS) ----------
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'mariana@correo.mx'),
                                          ('00000000-0000-0000-0000-000000000002', 'admin@eac.mx');
update app.profiles set auth_user_id = '00000000-0000-0000-0000-000000000001' where id = 1;
insert into app.profiles (id, matricula, role, first_name, auth_user_id)
  values (nextval('app.profiles_id_seq'), 'ADMIN-1', 'admin', 'Equipo EAC', '00000000-0000-0000-0000-000000000002');
grant usage on schema tests to authenticated, anon;
grant execute on function tests.check(boolean, text) to authenticated, anon;

-- Estudiante: Mariana (id 1)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
select tests.check((select count(*) from app.profiles) = 1, 'estudiante solo ve su perfil');
select tests.check((select count(*) from app.enrollments) = 2, 'estudiante solo ve sus inscripciones');
select tests.check((select count(*) from app.payments) = 2 and not exists (select 1 from app.payments where profile_id <> 1), 'estudiante solo ve sus pagos');
select tests.check((select count(*) from app.group_resources) = 2, 'estudiante ve recursos de sus grupos activos');
select tests.check((select count(*) from app.lessons) = 1, 'estudiante ve lecciones de su curso');
select tests.check((select count(*) from app.courses) = 2, 'catálogo: no ve cursos ocultos');
select tests.check((select string_agg(access_state, ',' order by group_id) from app.my_groups) = 'activo,activo', 'vista my_groups');
do $$ begin
  perform 1 from app.legacy_credentials;
  raise exception 'FALLÓ: estudiante pudo leer legacy_credentials';
exception when insufficient_privilege then raise notice 'ok  legacy_credentials inaccesible para estudiantes';
end $$;
do $$ begin
  perform app.group_access_state(2, 10);
  raise exception 'FALLÓ: estudiante pudo consultar el acceso de otra persona';
exception when insufficient_privilege then raise notice 'ok  no puede consultar el acceso de otra persona';
end $$;
do $$ begin
  update app.enrollments set status = 'activa' where profile_id = 1;
  raise exception 'FALLÓ: estudiante pudo modificar inscripciones';
exception when insufficient_privilege then raise notice 'ok  estudiante no puede modificar inscripciones';
end $$;

-- Estudiante con cuota vencida: Valeria (id 2) no ve el contenido del grupo pausado
reset role;
insert into auth.users (id) values ('00000000-0000-0000-0000-000000000003');
update public.inscripciones set estatus = 'activa' where id = 102;
select count(*) from app.sync_from_legacy();
update app.profiles set auth_user_id = '00000000-0000-0000-0000-000000000003' where id = 2;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', false);
select tests.check((select count(*) from app.group_resources) = 0, 'cuota vencida: no ve recursos del grupo');
select tests.check((select access_state from app.my_groups where group_id = 10) = 'pausado', 'cuota vencida: my_groups dice pausado');

-- Sin sesión (anon)
reset role; set role anon;
select set_config('request.jwt.claim.sub', '', false);
select tests.check((select count(*) from app.courses) = 2, 'visitante ve el catálogo público');
do $$ begin
  perform 1 from app.profiles;
  raise exception 'FALLÓ: visitante pudo leer perfiles';
exception when insufficient_privilege then raise notice 'ok  visitante no puede leer perfiles';
end $$;

-- Administración
reset role; set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
select tests.check((select count(*) from app.profiles) = 7, 'admin ve todos los perfiles');
select tests.check((select count(*) from app.courses) = 3, 'admin ve cursos ocultos');
reset role;
\echo 'TODAS LAS PRUEBAS PASARON'
