-- Pruebas de colegiaturas recurrentes y tolerancia.
\set ON_ERROR_STOP on
insert into app.courses (id, title) values (9500, 'Escuelita prueba');
insert into app.course_groups (id, course_id, name, price_total, recurrence) values (9501, 9500, 'Mensual', 800, 'mensual');
insert into app.course_groups (id, course_id, name, price_total, recurrence, ends_on) values (9502, 9500, 'Semanal con fin', 200, 'semanal', '2026-11-20');
insert into app.enrollments (id, profile_id, course_id, group_id, status, enrolled_at) values (995001, 1, 9500, 9501, 'activa', '2026-09-01');
insert into app.enrollments (id, profile_id, course_id, group_id, status, enrolled_at) values (995002, 2, 9500, 9502, 'activa', '2026-11-01');
insert into app.payments (id, profile_id, course_id, group_id, amount, due_date, status, paid_on) values (995101, 1, 9500, 9501, 800, '2026-09-01', 'pagado', '2026-09-01');

-- Al 20 de octubre con 5 días de anticipación: genera la cuota del 1 de octubre
select tests.check((select count(*) from app.generar_colegiaturas('2026-10-20', 5) where group_id = 9501) = 1, 'mensual: genera la cuota vencida de octubre');
select tests.check(exists (select 1 from app.payments where group_id = 9501 and due_date = '2026-10-01' and status = 'pendiente' and amount = 800), 'cuota de octubre por 800');
-- Al 27 de octubre: genera la de noviembre (anticipación) y no repite octubre
select tests.check((select count(*) from app.generar_colegiaturas('2026-10-27', 5) where group_id = 9501) = 1, 'genera la siguiente con anticipación');
select tests.check((select count(*) from app.payments where group_id = 9501 and status <> 'cancelado') = 3, 'no duplica cuotas');
select tests.check((select count(*) from app.generar_colegiaturas('2026-10-27', 5) where group_id = 9501) = 0, 'volver a correrlo no crea nada');

-- Semanal con fecha de fin: la primera desde la inscripción y se detiene al 20 de noviembre
select count(*) from app.generar_colegiaturas('2026-11-19', 5);
select tests.check((select array_agg(due_date order by due_date)::text from app.payments where group_id = 9502) = '{2026-11-01,2026-11-08,2026-11-15}', 'semanal: 1, 8 y 15 de noviembre');
select tests.check(not exists (select 1 from app.payments where group_id = 9502 and due_date > '2026-11-20'), 'no genera después del fin del grupo');

-- Baja: deja de generar
update app.enrollments set status = 'baja' where id = 995001;
select tests.check((select count(*) from app.generar_colegiaturas('2027-03-01', 5) where group_id = 9501) = 0, 'con baja ya no genera');
update app.enrollments set status = 'activa' where id = 995001;

-- Tolerancia de 3 días
delete from app.payments where group_id = 9501 and status = 'pendiente';
insert into app.payments (id, profile_id, course_id, group_id, amount, due_date, status) values (995201, 1, 9500, 9501, 800, (now() at time zone 'America/Mexico_City')::date - 2, 'pendiente');
select tests.check(app.group_access_state(1, 9501) = 'activo', 'vencida hace 2 días: sigue activo (tolerancia)');
update app.payments set due_date = (now() at time zone 'America/Mexico_City')::date - 4 where id = 995201;
select tests.check(app.group_access_state(1, 9501) = 'pausado', 'vencida hace 4 días: pausado');
update app.settings set value = '0' where key = 'dias_tolerancia';
update app.payments set due_date = (now() at time zone 'America/Mexico_City')::date - 1 where id = 995201;
select tests.check(app.group_access_state(1, 9501) = 'pausado', 'sin tolerancia: pausado al día siguiente');
update app.settings set value = '3' where key = 'dias_tolerancia';
select tests.check(app.siguiente_periodo('2026-01-31', 'mensual') = '2026-02-28', 'mensual del 31 pasa al último día de febrero');
\echo 'PRUEBAS DE COLEGIATURAS PASARON'
