-- Pruebas de constancias: una vigente por grupo y seguridad.
\set ON_ERROR_STOP on

insert into app.certificates (folio, profile_id, course_id, group_id, full_name, course_title)
  values ('EAC-TEST01', 1, 1, 10, 'Mariana Prueba', 'Curso');
do $$ begin
  insert into app.certificates (folio, profile_id, course_id, group_id, full_name, course_title)
    values ('EAC-TEST02', 1, 1, 10, 'Mariana Prueba', 'Curso');
  raise exception 'FALLÓ: se permitieron dos constancias vigentes del mismo grupo';
exception when unique_violation then raise notice 'ok  una constancia vigente por grupo';
end $$;
update app.certificates set revoked_at = now() where folio = 'EAC-TEST01';
insert into app.certificates (folio, profile_id, course_id, group_id, full_name, course_title)
  values ('EAC-TEST03', 1, 1, 10, 'Mariana Prueba', 'Curso');
select tests.check((select count(*) from app.certificates where profile_id = 1) = 2, 'revocada permite emitir una nueva');
select tests.check((select value #>> '{}' from app.settings where key = 'constancia_firma_nombre') = 'Dirección Académica', 'firma por defecto');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$ begin
  perform 1 from app.certificates;
  raise exception 'FALLÓ: estudiante pudo leer constancias directamente';
exception when insufficient_privilege then raise notice 'ok  constancias solo desde el servidor';
end $$;
reset role;
\echo 'PRUEBAS DE CONSTANCIAS PASARON'
