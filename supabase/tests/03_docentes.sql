-- Pruebas del portal de docentes: reparto de ganancias y seguridad.
\set ON_ERROR_STOP on

-- Docente externo dueño de un curso nuevo (oculto mientras se revisa)
insert into app.profiles (id, matricula, role, first_name) values (900001, 'DOC-1', 'teacher', 'Docente Uno');
insert into app.courses (id, title, owner_id, review_status, is_visible, teacher_share)
  values (9001, 'Curso de tercero', 900001, 'en_revision', false, null);
insert into app.course_groups (id, course_id, name, price_total) values (9101, 9001, 'G1', 1000);

select tests.check((select review_status from app.courses where id = 1) = 'aprobado', 'cursos existentes quedan aprobados');
select tests.check((select owner_id from app.courses where id = 1) is null, 'cursos existentes son de EAC');

-- Pago de un curso de EAC: no genera ganancias de docente
insert into app.payments (id, profile_id, course_id, group_id, amount, amount_received, status, paid_on)
  values (990001, 1, 1, 10, 500, 500, 'pagado', '2026-11-03');
select tests.check(not exists (select 1 from app.teacher_earnings where payment_id = 990001), 'curso de EAC no genera ganancia');

-- Pago con tarjeta de un curso de tercero: (1000 − 40.60) × 70 % = 671.58
insert into app.payments (id, profile_id, course_id, group_id, amount, amount_received, status, paid_on, gateway_fee)
  values (990002, 1, 9001, 9101, 1000, 1000, 'pagado', '2026-11-05', 40.60);
select tests.check((select teacher_amount from app.teacher_earnings where payment_id = 990002) = 671.58, 'docente recibe 70 % del neto');
select tests.check((select eac_amount from app.teacher_earnings where payment_id = 990002) = 287.82, 'EAC recibe el resto después de la comisión');
select tests.check((select share_pct from app.teacher_earnings where payment_id = 990002) = 70, 'usa el porcentaje general');
select tests.check((select earned_on from app.teacher_earnings where payment_id = 990002) = '2026-11-05', 'fecha de la ganancia = fecha de pago');

-- Cuota pendiente que luego se paga en efectivo (sin comisión), con porcentaje propio del curso
update app.courses set teacher_share = 80 where id = 9001;
insert into app.payments (id, profile_id, course_id, group_id, amount, status, due_date)
  values (990003, 1, 9001, 9101, 500, 'pendiente', '2026-12-01');
select tests.check(not exists (select 1 from app.teacher_earnings where payment_id = 990003), 'cuota pendiente no genera ganancia');
update app.payments set status = 'pagado', paid_on = '2026-11-20', amount_received = 500 where id = 990003;
select tests.check((select teacher_amount from app.teacher_earnings where payment_id = 990003) = 400, 'cuota pagada: 80 % configurado en el curso');

-- Cancelar un pago no liquidado borra su ganancia
update app.payments set status = 'cancelado' where id = 990003;
select tests.check(not exists (select 1 from app.teacher_earnings where payment_id = 990003), 'pago cancelado sin liquidar: se quita la ganancia');

-- Cancelar un pago ya liquidado deja un reverso negativo
insert into app.teacher_payouts (id, teacher_id, period_start, period_end, amount) values (1, 900001, '2026-11-01', '2026-11-15', 671.58);
update app.teacher_earnings set payout_id = 1 where payment_id = 990002;
update app.payments set status = 'cancelado' where id = 990002;
select tests.check((select teacher_amount from app.teacher_earnings where payment_id = 990002 and kind = 'reverso') = -671.58, 'pago liquidado y cancelado: reverso negativo');
select tests.check((select count(*) from app.teacher_earnings where payment_id = 990002) = 2, 'la venta liquidada se conserva');

-- Seguridad: estudiantes y visitantes no ven nada del portal
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);
do $$ begin
  perform 1 from app.teacher_earnings;
  raise exception 'FALLÓ: estudiante pudo leer ganancias';
exception when insufficient_privilege then raise notice 'ok  estudiante no puede leer ganancias';
end $$;
select tests.check(not exists (select 1 from app.courses where id = 9001), 'curso en revisión no aparece a estudiantes');
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select tests.check(not exists (select 1 from app.courses where id = 9001), 'curso en revisión no aparece en el catálogo');
reset role;
\echo 'PRUEBAS DE DOCENTES PASARON'
