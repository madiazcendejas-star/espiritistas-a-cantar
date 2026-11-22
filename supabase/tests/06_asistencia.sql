-- Pruebas de asistencia: columnas nuevas y una fila por persona y sesión.
\set ON_ERROR_STOP on
insert into app.live_sessions (id, group_id, number, title, starts_at) values (990001, 10, 1, 'Sesión prueba', now());
insert into app.attendance (profile_id, session_id) values (1, 990001);
select tests.check((select join_count from app.attendance where profile_id = 1 and session_id = 990001) = 1, 'primera entrada cuenta 1');
select tests.check((select method from app.attendance where profile_id = 1 and session_id = 990001) = 'automatica', 'registro automático por defecto');
do $$ begin
  insert into app.attendance (profile_id, session_id) values (1, 990001);
  raise exception 'FALLÓ: asistencia duplicada';
exception when unique_violation then raise notice 'ok  una asistencia por persona y sesión';
end $$;
do $$ begin
  update app.attendance set method = 'otra' where session_id = 990001;
  raise exception 'FALLÓ: método inválido aceptado';
exception when check_violation then raise notice 'ok  método validado';
end $$;
\echo 'PRUEBAS DE ASISTENCIA PASARON'
