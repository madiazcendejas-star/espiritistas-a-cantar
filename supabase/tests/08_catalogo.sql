\set ON_ERROR_STOP on
update app.courses set categories = '{tarot,oraculos}', level = 'principiante', modules_count = 8 where id = 1;
select tests.check((select count(*) from app.courses where categories @> '{tarot}') = 1, 'filtra cursos por categoría');
do $$ begin
  update app.courses set level = 'experto' where id = 1;
  raise exception 'FALLÓ: nivel inválido aceptado';
exception when check_violation then raise notice 'ok  nivel validado';
end $$;
\echo 'PRUEBAS DE CATÁLOGO PASARON'
