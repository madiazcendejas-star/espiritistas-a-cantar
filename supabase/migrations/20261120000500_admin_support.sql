-- =====================================================================
-- EAC Academia v2 · Soporte para el panel de Administración
-- - Pagos: quién registró un pago manual y cuándo.
-- - Bitácora de acciones de administración.
-- - Funciones para matrícula e id consecutivos de cuentas nuevas.
-- - La sincronización ya no pisa pagos registrados en v2.
-- =====================================================================

alter table app.payments
  add column if not exists registered_by bigint references app.profiles(id),
  add column if not exists registered_at timestamptz;

create table if not exists app.audit_log (
  id          bigserial primary key,
  actor_id    bigint references app.profiles(id),
  action      text not null,
  entity      text not null,
  entity_id   text,
  detail      jsonb,
  created_at  timestamptz not null default now()
);
alter table app.audit_log enable row level security;
grant all on app.audit_log to service_role;
grant usage, select on sequence app.audit_log_id_seq to service_role;

create or replace function app.next_matricula() returns text
language sql volatile security definer set search_path = app as $$
  select nextval('app.matricula_seq')::text
$$;

create or replace function app.next_profile_id() returns bigint
language sql volatile security definer set search_path = app as $$
  select nextval('app.profiles_id_seq')
$$;

create or replace function app.next_id(p_seq text) returns bigint
language plpgsql volatile security definer set search_path = app as $$
begin
  if p_seq not in ('courses_id_seq', 'course_groups_id_seq', 'enrollments_id_seq', 'payments_id_seq',
                   'group_resources_id_seq', 'live_sessions_id_seq') then
    raise exception 'secuencia no permitida: %', p_seq;
  end if;
  return nextval('app.' || p_seq);
end $$;

revoke execute on function app.next_matricula(), app.next_profile_id(), app.next_id(text) from public, anon, authenticated;
grant execute on function app.next_matricula(), app.next_profile_id(), app.next_id(text) to service_role;
