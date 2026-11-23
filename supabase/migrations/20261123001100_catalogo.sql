-- =====================================================================
-- EAC Academia v2 · Catálogo: categorías, nivel y módulos de cada curso
-- =====================================================================
alter table app.courses add column if not exists categories text[] not null default '{}';
alter table app.courses add column if not exists level text;
alter table app.courses add column if not exists modules_count integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_level_chk') then
    alter table app.courses add constraint courses_level_chk
      check (level is null or level in ('principiante', 'intermedio', 'avanzado', 'todos'));
  end if;
end $$;

create index if not exists courses_categories_idx on app.courses using gin (categories);
