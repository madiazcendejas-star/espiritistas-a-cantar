-- =====================================================================
-- EAC Academia v2 · Constancias e insignias
--
-- - content_progress: qué clases grabadas marcó como vistas cada estudiante.
-- - certificates: constancias con folio único (automáticas al ver todas las
--   grabaciones del grupo, o emitidas a mano por administración o docente).
-- - learning_paths: rutas temáticas (varios cursos). Al tener constancia de
--   todos los cursos de una ruta se gana su sello (se calcula al mostrarlo).
-- Todo se lee y escribe desde el servidor (service role).
-- =====================================================================

create table if not exists app.content_progress (
  profile_id    bigint not null references app.profiles(id),
  group_id      bigint not null references app.course_groups(id) on delete cascade,
  item_key      text not null,          -- r-<recurso>, l-<lección>, s-<sesión con grabación>
  completed_at  timestamptz not null default now(),
  primary key (profile_id, group_id, item_key)
);

create table if not exists app.certificates (
  id             bigserial primary key,
  folio          text not null unique,
  profile_id     bigint not null references app.profiles(id),
  course_id      bigint not null references app.courses(id),
  group_id       bigint references app.course_groups(id),
  full_name      text not null,          -- como aparece en la constancia
  matricula      text,
  course_title   text not null,
  group_name     text,
  issued_on      date not null default ((now() at time zone 'America/Mexico_City')::date),
  method         text not null default 'automatica' check (method in ('automatica', 'manual')),
  issued_by      bigint references app.profiles(id),
  revoked_at     timestamptz,
  revoked_reason text,
  created_at     timestamptz not null default now()
);
-- Una constancia vigente por persona y grupo
create unique index if not exists certificates_vigente_idx on app.certificates (profile_id, group_id) where revoked_at is null;
create index if not exists certificates_profile_idx on app.certificates (profile_id);

create table if not exists app.learning_paths (
  id           bigserial primary key,
  title        text not null,
  description  text,
  color        text not null default '#6e3fc3',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists app.learning_path_courses (
  path_id    bigint not null references app.learning_paths(id) on delete cascade,
  course_id  bigint not null references app.courses(id),
  primary key (path_id, course_id)
);

insert into app.settings (key, value) values
  ('constancia_firma_nombre', '"Dirección Académica"'),
  ('constancia_firma_cargo', '"EAC Academia"')
on conflict (key) do nothing;

alter table app.content_progress      enable row level security;
alter table app.certificates          enable row level security;
alter table app.learning_paths        enable row level security;
alter table app.learning_path_courses enable row level security;

grant select, insert, update, delete on app.content_progress, app.certificates, app.learning_paths,
  app.learning_path_courses to service_role;
grant usage, select on sequence app.certificates_id_seq, app.learning_paths_id_seq to service_role;
