-- =====================================================================
-- EAC Academia v2 · Esquema "app"
-- Vive junto a las tablas actuales de "public" sin modificarlas.
-- La app actual sigue funcionando sobre "public" hasta el día del corte.
-- =====================================================================
create schema if not exists app;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Perfiles (estudiantes, docentes, administración)
-- id = public.alumnos.id para los registros migrados.
-- ---------------------------------------------------------------------
create table if not exists app.profiles (
  id                    bigint primary key,
  auth_user_id          uuid unique references auth.users(id) on delete set null,
  matricula             text not null unique,
  role                  text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  first_name            text,
  last_name             text,
  phone                 text,             -- como lo capturó el estudiante
  phone10               text,             -- últimos 10 dígitos, para buscar
  email                 text,             -- correo real; null si no tiene
  email_verified        boolean not null default false,
  birth_date            date,
  postal_code           text,
  state                 text,
  country               text,
  address               text,
  must_change_password  boolean not null default false,
  first_login           boolean not null default true,
  source                text not null default 'registro' check (source in ('migracion', 'registro', 'compra', 'manual')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index if not exists profiles_email_unique on app.profiles (lower(email)) where email is not null;
create index if not exists profiles_phone10_idx on app.profiles (phone10);

-- Ids y matrículas para cuentas NUEVAS (los migrados conservan los suyos).
create sequence if not exists app.profiles_id_seq start 100000;
create sequence if not exists app.matricula_seq start 10000;

-- Contraseñas heredadas, cifradas con bcrypt. Solo la usa el script que crea
-- las cuentas de Supabase Auth. Sin políticas RLS: nadie la lee desde la app.
create table if not exists app.legacy_credentials (
  profile_id       bigint primary key references app.profiles(id) on delete cascade,
  password_bcrypt  text not null,
  migrated_at      timestamptz
);

-- ---------------------------------------------------------------------
-- Cursos (madre) y grupos (hijos)
-- ---------------------------------------------------------------------
create table if not exists app.courses (
  id               bigint primary key,
  title            text not null,
  description      text,
  what_you_learn   text,
  duration_text    text,
  cover_url        text,
  manual_pdf_url   text,
  price            numeric(10,2) not null default 0,
  modality         text,
  required_classes integer,
  is_visible       boolean not null default true,
  is_upcoming      boolean not null default false,
  is_featured      boolean not null default false,
  created_at       timestamptz not null default now()
);
create sequence if not exists app.courses_id_seq start 1000;

create table if not exists app.course_groups (
  id               bigint primary key,
  course_id        bigint not null references app.courses(id),
  name             text not null,
  modality         text not null default 'en_linea' check (modality in ('en_linea', 'presencial', 'grabado', 'mixto')),
  starts_on        date,
  ends_on          date,
  price_total      numeric(10,2) not null default 0,
  enrollment_fee   numeric(10,2) not null default 0,
  installments     integer not null default 1 check (installments >= 1),
  frequency        text,
  capacity         integer,
  schedule_text    text,
  info_text        text,
  whatsapp_url     text,
  status           text not null default 'activo',
  created_at       timestamptz not null default now()
);
create index if not exists course_groups_course_idx on app.course_groups (course_id);
create sequence if not exists app.course_groups_id_seq start 1000;

-- ---------------------------------------------------------------------
-- Inscripciones: el acceso. Vigencia permanente (decisión 20 nov 2026).
-- ---------------------------------------------------------------------
create table if not exists app.enrollments (
  id           bigint primary key,
  profile_id   bigint not null references app.profiles(id),
  course_id    bigint not null references app.courses(id),
  group_id     bigint not null references app.course_groups(id),
  status       text not null default 'activa' check (status in ('activa', 'baja')),
  drop_reason  text,
  source       text not null default 'manual' check (source in ('migracion', 'compra', 'manual')),
  enrolled_at  timestamptz not null default now(),
  unique (profile_id, group_id)
);
create index if not exists enrollments_profile_idx on app.enrollments (profile_id);
create sequence if not exists app.enrollments_id_seq start 100000;

-- ---------------------------------------------------------------------
-- Pagos y cuotas (parcialidades)
-- ---------------------------------------------------------------------
create table if not exists app.payments (
  id                  bigint primary key,
  profile_id          bigint not null references app.profiles(id),
  course_id           bigint references app.courses(id),
  group_id            bigint references app.course_groups(id),
  amount              numeric(10,2) not null,
  amount_received     numeric(10,2) not null default 0,
  due_date            date,
  paid_on             date,
  status              text not null default 'pendiente' check (status in ('pendiente', 'pagado', 'cancelado', 'en_revision')),
  method              text check (method in ('tarjeta', 'spei', 'oxxo', 'efectivo', 'transferencia', 'otro')),
  receipt_url         text,              -- comprobantes históricos
  notes               text,
  stripe_payment_id   text unique,
  created_at          timestamptz not null default now()
);
create index if not exists payments_profile_group_idx on app.payments (profile_id, group_id);
create sequence if not exists app.payments_id_seq start 100000;

-- ---------------------------------------------------------------------
-- Contenido
-- ---------------------------------------------------------------------
create table if not exists app.lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   bigint not null references app.courses(id),
  title       text not null,
  video_url   text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists app.group_resources (
  id          bigint primary key,
  group_id    bigint not null references app.course_groups(id),
  title       text not null,
  kind        text not null default 'video',
  url         text not null,
  created_at  timestamptz not null default now()
);
create sequence if not exists app.group_resources_id_seq start 10000;

create table if not exists app.live_sessions (
  id              bigint primary key,
  group_id        bigint not null references app.course_groups(id),
  number          integer not null,
  title           text not null,
  starts_at       timestamptz not null,
  meet_url        text,
  recording_url   text,
  created_at      timestamptz not null default now()
);
create sequence if not exists app.live_sessions_id_seq start 10000;

create table if not exists app.lesson_progress (
  profile_id      bigint not null references app.profiles(id),
  lesson_id       uuid not null references app.lessons(id) on delete cascade,
  seconds_watched integer not null default 0,
  completed_at    timestamptz,
  updated_at      timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

create table if not exists app.attendance (
  profile_id   bigint not null references app.profiles(id),
  session_id   bigint not null references app.live_sessions(id) on delete cascade,
  joined_at    timestamptz not null default now(),
  primary key (profile_id, session_id)
);

-- ---------------------------------------------------------------------
-- Otros datos que se conservan
-- ---------------------------------------------------------------------
create table if not exists app.prospects (
  id          bigint primary key,
  name        text not null,
  phone       text,
  email       text,
  course_id   bigint references app.courses(id),
  status      text not null default 'Nuevo',
  notes       text,
  created_at  timestamptz not null default now()
);
create sequence if not exists app.prospects_id_seq start 10000;

create table if not exists app.announcements (
  id          bigint primary key,
  title       text not null,
  message     text not null,
  is_active   boolean not null default true,
  updated_at  timestamptz not null default now()
);

create table if not exists app.access_log (
  id          bigint primary key,
  profile_id  bigint not null references app.profiles(id),
  accessed_at timestamptz not null default now()
);
create sequence if not exists app.access_log_id_seq start 1000000;

create table if not exists app.reviews (
  id          bigint primary key,
  profile_id  bigint references app.profiles(id),
  course_id   bigint references app.courses(id),
  stars       integer not null check (stars between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- Registro de lo que la migración no pudo resolver sola (revisión manual).
create table if not exists app.migration_issues (
  id           bigserial primary key,
  entity       text not null,
  legacy_id    text not null,
  issue        text not null,
  detail       jsonb,
  resolved     boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (entity, legacy_id, issue)
);

-- updated_at automático
create or replace function app.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists profiles_touch on app.profiles;
create trigger profiles_touch before update on app.profiles for each row execute function app.touch_updated_at();
