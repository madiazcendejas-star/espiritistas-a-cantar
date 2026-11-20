-- Datos FICTICIOS que reproducen los casos del diagnóstico del 20 nov 2026.
insert into public.cursos (id, "Nombre_curso", precio, visible_web) overriding system value values
  (1, 'Tarot terapéutico', 2400, true), (2, 'Baraja española', 980, true), (3, 'Curso oculto', 500, false);
insert into public.grupos (id, curso_id, nombre_grupo, costo_total, num_pagos, duracion_acceso, tipo_modalidad) values
  (10, 1, 'Tarot marzo', 2400, 3, '1_ano', 'en_linea'),
  (11, 2, 'Baraja grabado', 980, 1, '1_ano', 'en_linea'),
  (12, 1, 'Tarot presencial', 3000, 1, '1_ano', 'presencial');

insert into public.alumnos (id, matricula, "Nombre", nombre, apellidos, telefono, correo, email, password) overriding system value values
  (1, '1048',    'Mariana', 'Mariana', 'Vega',  '33 1234 5678',     'mariana@correo.mx', null, 'Luna2026'),
  (2, 'EAC-012', null,      'Valeria', 'Núñez', '5512345678',       'EMPTY',             null, 'abc'),          -- matrícula no numérica, sin correo, contraseña corta
  (3, null,      'Jorge',   'Jorge',   'Salas', '+52 55 1234 5678', 'jorge@correo.mx',   null, 'jorge123'),     -- sin matrícula, teléfono compartido con 2
  (4, '9619',    'Ana',     'Anita',   'Ruiz',  '3311112222',       'JORGE@correo.mx',   null, 'anapass'),      -- correo repetido con 3, nombres distintos
  (5, '2001',    'Luis',    null,      'Paz',   '3399998888',       null,                'luis@correo.mx', 'luispass'), -- correo solo en "email"
  (6, '2002',    'Sin',     'Sin',     'Cursos','3377776666',       'sin@correo.mx',     null, 'sinpass1');     -- sin inscripciones

insert into public.inscripciones (id, alumno_id, curso_id, "Estatus", estatus, grupo_id) overriding system value values
  (100, '1',  1, '', 'activa', 10),
  (101, '1',  2, '', 'activa', 11),
  (102, '2',  1, '', 'activa', 10),
  (103, '3',  2, '', 'baja',   11),
  (104, '4',  1, '', 'activa', 12),
  (105, '4',  1, '', 'activa', 12),   -- duplicada
  (106, '99', 1, '', 'activa', 10),   -- alumno inexistente
  (107, '5',  2, '', 'baja',   11),
  (108, '5',  2, '', 'activa', 11);   -- duplicada con una baja: debe quedar activa

insert into public.pagos (id, alumno_id, curso_id, grupo_id, monto, fecha_pago, estatus, fecha_vencimiento, comprobante_url) overriding system value values
  (500, 1, 1, 10, 800,  '2026-09-01', 'Pagado',    '2026-09-01', null),
  (501, 1, 1, 10, 800,  null,         'Pendiente', '2027-01-15', null),   -- cuota futura: acceso activo
  (502, 2, 1, 10, 800,  null,         'Pendiente', '2026-10-01', null),   -- cuota vencida: acceso pausado
  (503, 4, 1, 12, 3000, null,         'Revision',  '2026-11-01', 'https://ejemplo/comprobante.jpg'),
  (504, 77, 1, 10, 100, null,         'Pendiente', '2026-12-01', null),   -- alumno inexistente
  (505, 5, 2, 11, 980,  '2026-08-01', 'Cancelado', null, null);

insert into public.recursos (id, grupo_id, titulo, tipo, url) values (1, 10, 'Clase 1', 'video', 'https://v/1'), (2, 11, 'Manual', 'pdf', 'https://v/2');
insert into public.sesiones_grupo (id, grupo_id, numero_sesion, titulo_sesion, fecha_hora, enlace_meet) overriding system value values
  (1, 10, 1, 'Círculo de integración', '2026-12-01 19:00-06', 'https://meet.google.com/abc');
insert into public.lecciones_lms (curso_id, titulo, video_url, orden) values (2, 'Introducción', 'https://v/intro', 1);
insert into public.historial_accesos (alumno_id) values (1), (2), (99);
insert into public.configuracion_anuncios (titulo, mensaje) values ('Bienvenida', 'Hola');
insert into public.prospectos (nombre, curso_id) values ('Prospecto', 1);
insert into public.tandas_misas (alumno_id, fecha_inicio, fecha_fin) values (1, '2026-01-01', '2026-03-01');
