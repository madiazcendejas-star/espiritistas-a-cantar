-- =====================================================================
-- EAC Academia v2 · Tienda de ebooks y materiales digitales
--
-- - products: ebooks, cuadernos de trabajo, mazos imprimibles, guías (PDF).
-- - product_purchases: quién compró qué (una vez; acceso permanente).
-- - Archivos en Supabase Storage: bucket privado «ebooks» (solo se descarga
--   con enlaces firmados que caducan) y bucket público «portadas».
-- Todo se lee y escribe desde el servidor (service role).
-- =====================================================================

create table if not exists app.products (
  id            bigserial primary key,
  kind          text not null default 'ebook' check (kind in ('ebook', 'workbook', 'mazo', 'guia')),
  title         text not null,
  subtitle      text,
  description   text,
  author        text,
  pages         integer,
  price         numeric(10,2) not null default 0,
  cover_url     text,
  file_path     text,                 -- ruta dentro del bucket «ebooks»
  file_name     text,
  file_size     bigint,
  is_visible    boolean not null default false,
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists app.product_purchases (
  id                 bigserial primary key,
  product_id         bigint not null references app.products(id),
  profile_id         bigint not null references app.profiles(id),
  amount             numeric(10,2) not null default 0,
  gateway_fee        numeric(10,2) not null default 0,
  method             text,
  stripe_payment_id  text unique,
  source             text not null default 'compra' check (source in ('compra', 'regalo', 'manual')),
  granted_by         bigint references app.profiles(id),
  purchased_on       date not null default ((now() at time zone 'America/Mexico_City')::date),
  download_count     integer not null default 0,
  last_download_at   timestamptz,
  created_at         timestamptz not null default now(),
  unique (product_id, profile_id)
);
create index if not exists product_purchases_profile_idx on app.product_purchases (profile_id);

alter table app.products          enable row level security;
alter table app.product_purchases enable row level security;
grant select, insert, update, delete on app.products, app.product_purchases to service_role;
grant usage, select on sequence app.products_id_seq, app.product_purchases_id_seq to service_role;

-- Buckets de Storage (solo existen en Supabase; en pruebas locales se omiten)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('ebooks', 'ebooks', false, 209715200, array['application/pdf'])
    on conflict (id) do nothing;
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('portadas', 'portadas', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end $$;
