-- =====================================================================
-- EAC Academia v2 · Portal de docentes y marketplace
--
-- - Docentes de EAC: se asignan a grupos (group_teachers) y administran
--   sus materiales y clases en vivo.
-- - Docentes externos: son dueños de sus cursos (courses.owner_id), los
--   envían a revisión y reciben un porcentaje de cada pago.
-- - Ganancias: un trigger en payments registra el reparto de cada pago de
--   un curso con dueño (teacher_earnings). Los cortes quincenales se
--   agrupan en teacher_payouts.
-- Todo se lee y escribe desde el servidor (service role); RLS sin
-- políticas = nadie más puede leer estas tablas.
-- =====================================================================

-- Cursos: dueño, revisión y porcentaje del docente
alter table app.courses add column if not exists owner_id bigint references app.profiles(id);
alter table app.courses add column if not exists review_status text not null default 'aprobado';
alter table app.courses add column if not exists review_notes text;
alter table app.courses add column if not exists submitted_at timestamptz;
alter table app.courses add column if not exists teacher_share numeric(5,2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_review_status_chk') then
    alter table app.courses add constraint courses_review_status_chk
      check (review_status in ('borrador', 'en_revision', 'aprobado', 'rechazado'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'courses_teacher_share_chk') then
    alter table app.courses add constraint courses_teacher_share_chk
      check (teacher_share is null or (teacher_share >= 0 and teacher_share <= 100));
  end if;
end $$;

create index if not exists courses_owner_idx on app.courses (owner_id) where owner_id is not null;

-- Pagos: comisión de la pasarela (Stripe), para calcular el neto
alter table app.payments add column if not exists gateway_fee numeric(10,2) not null default 0;

-- Docentes asignados a grupos (docentes de EAC o apoyo en cursos de terceros)
create table if not exists app.group_teachers (
  group_id    bigint not null references app.course_groups(id) on delete cascade,
  profile_id  bigint not null references app.profiles(id),
  created_at  timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index if not exists group_teachers_profile_idx on app.group_teachers (profile_id);

-- Perfil público y datos de pago del docente
create table if not exists app.teacher_profiles (
  profile_id   bigint primary key references app.profiles(id),
  specialty    text,
  bio          text,
  sample_url   text,
  payout_info  text,          -- banco y CLABE para las liquidaciones (solo docente y administración)
  updated_at   timestamptz not null default now()
);

-- Solicitudes para ser docente
create table if not exists app.teacher_applications (
  id            bigserial primary key,
  profile_id    bigint not null references app.profiles(id),
  specialty     text,
  bio           text,
  sample_url    text,
  proposal      text,
  status        text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  review_notes  text,
  reviewed_by   bigint references app.profiles(id),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists teacher_applications_status_idx on app.teacher_applications (status, created_at);

-- Ajustes generales
create table if not exists app.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
insert into app.settings (key, value) values ('docente_porcentaje', '70') on conflict (key) do nothing;

-- Cortes (liquidaciones) a docentes
create table if not exists app.teacher_payouts (
  id            bigserial primary key,
  teacher_id    bigint not null references app.profiles(id),
  period_start  date not null,
  period_end    date not null,
  amount        numeric(10,2) not null,
  status        text not null default 'pendiente' check (status in ('pendiente', 'pagado')),
  paid_on       date,
  reference     text,
  created_by    bigint references app.profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists teacher_payouts_teacher_idx on app.teacher_payouts (teacher_id, period_start);

-- Libro de ganancias: una fila por pago (venta) y, si se cancela un pago ya liquidado, su reverso
create table if not exists app.teacher_earnings (
  id              bigserial primary key,
  payment_id      bigint not null references app.payments(id),
  kind            text not null default 'venta' check (kind in ('venta', 'reverso')),
  teacher_id      bigint not null references app.profiles(id),
  course_id       bigint references app.courses(id),
  group_id        bigint references app.course_groups(id),
  gross           numeric(10,2) not null,
  gateway_fee     numeric(10,2) not null default 0,
  share_pct       numeric(5,2) not null,
  teacher_amount  numeric(10,2) not null,
  eac_amount      numeric(10,2) not null,
  earned_on       date not null,
  payout_id       bigint references app.teacher_payouts(id),
  created_at      timestamptz not null default now(),
  unique (payment_id, kind)
);
create index if not exists teacher_earnings_teacher_idx on app.teacher_earnings (teacher_id, earned_on);
create index if not exists teacher_earnings_pending_idx on app.teacher_earnings (teacher_id) where payout_id is null;

-- ---------------------------------------------------------------------
-- Reparto automático de cada pago de un curso con dueño
-- Ingreso del docente = (monto − comisión de la pasarela) × % del docente
-- ---------------------------------------------------------------------
create or replace function app.registrar_ganancia() returns trigger
language plpgsql security definer set search_path = app, public as $$
declare
  v_owner  bigint;
  v_share  numeric;
  v_pct    numeric;
  v_monto  numeric;
  v_fee    numeric;
  v_doc    numeric;
  v_venta  app.teacher_earnings%rowtype;
begin
  if new.course_id is null then return new; end if;
  select owner_id, teacher_share into v_owner, v_share from app.courses where id = new.course_id;
  if v_owner is null then return new; end if;

  if new.status = 'pagado' and (tg_op = 'INSERT' or old.status is distinct from 'pagado') then
    v_pct := coalesce(v_share, (select (value #>> '{}')::numeric from app.settings where key = 'docente_porcentaje'), 70);
    v_monto := coalesce(nullif(new.amount_received, 0), new.amount);
    v_fee := least(coalesce(new.gateway_fee, 0), v_monto);
    v_doc := round((v_monto - v_fee) * v_pct / 100, 2);

    -- Si se había reversado sin liquidar, se borra el reverso y se vuelve a contar.
    delete from app.teacher_earnings where payment_id = new.id and kind = 'reverso' and payout_id is null;
    delete from app.teacher_earnings where payment_id = new.id and kind = 'venta' and payout_id is null;

    insert into app.teacher_earnings (payment_id, kind, teacher_id, course_id, group_id, gross, gateway_fee,
                                      share_pct, teacher_amount, eac_amount, earned_on)
    values (new.id, 'venta', v_owner, new.course_id, new.group_id, v_monto, v_fee, v_pct, v_doc,
            v_monto - v_fee - v_doc, coalesce(new.paid_on, (now() at time zone 'America/Mexico_City')::date))
    on conflict (payment_id, kind) do nothing;

  elsif tg_op = 'UPDATE' and old.status = 'pagado' and new.status <> 'pagado' then
    select * into v_venta from app.teacher_earnings where payment_id = new.id and kind = 'venta';
    if found then
      if v_venta.payout_id is null then
        delete from app.teacher_earnings where id = v_venta.id;
      else
        -- Ya se le pagó al docente: queda un reverso que se descuenta en el siguiente corte.
        insert into app.teacher_earnings (payment_id, kind, teacher_id, course_id, group_id, gross, gateway_fee,
                                          share_pct, teacher_amount, eac_amount, earned_on)
        values (new.id, 'reverso', v_venta.teacher_id, v_venta.course_id, v_venta.group_id, -v_venta.gross,
                -v_venta.gateway_fee, v_venta.share_pct, -v_venta.teacher_amount, -v_venta.eac_amount,
                (now() at time zone 'America/Mexico_City')::date)
        on conflict (payment_id, kind) do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_ganancia on app.payments;
create trigger payments_ganancia after insert or update of status on app.payments
  for each row execute function app.registrar_ganancia();

revoke all on function app.registrar_ganancia() from public, anon, authenticated;

-- Seguridad: solo el servidor (service role) lee y escribe estas tablas.
alter table app.group_teachers       enable row level security;
alter table app.teacher_profiles     enable row level security;
alter table app.teacher_applications enable row level security;
alter table app.settings             enable row level security;
alter table app.teacher_payouts      enable row level security;
alter table app.teacher_earnings     enable row level security;

grant select, insert, update, delete on app.group_teachers, app.teacher_profiles, app.teacher_applications,
  app.settings, app.teacher_payouts, app.teacher_earnings to service_role;
grant usage, select on sequence app.teacher_applications_id_seq, app.teacher_payouts_id_seq,
  app.teacher_earnings_id_seq to service_role;
