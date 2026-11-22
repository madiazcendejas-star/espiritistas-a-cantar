-- =====================================================================
-- EAC Academia v2 · Registro de asistencia a clases en vivo
-- Se registra solo al tocar «Unirse a la clase en vivo»; docentes y
-- administración pueden marcarla a mano (quien entró por otra liga).
-- =====================================================================
alter table app.attendance add column if not exists join_count integer not null default 1;
alter table app.attendance add column if not exists last_joined_at timestamptz;
alter table app.attendance add column if not exists method text not null default 'automatica';
alter table app.attendance add column if not exists marked_by bigint references app.profiles(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attendance_method_chk') then
    alter table app.attendance add constraint attendance_method_chk check (method in ('automatica', 'manual'));
  end if;
end $$;

create index if not exists attendance_session_idx on app.attendance (session_id);
grant select, insert, update, delete on app.attendance to service_role;
