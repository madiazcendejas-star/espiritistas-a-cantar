# EAC Academia v2 · Base de datos

Las tablas nuevas viven en el esquema `app`, dentro del mismo proyecto de Supabase. Las tablas actuales de `public` **no se modifican**: la app actual sigue funcionando hasta el día del corte y la reversa es inmediata.

## Archivos

| Archivo | Qué hace |
| --- | --- |
| `migrations/20261120000100_app_schema.sql` | Tablas del esquema `app` |
| `migrations/20261120000200_app_access_rls.sql` | Regla de acceso (inscripción activa y sin cuota vencida) y seguridad por filas (RLS) |
| `migrations/20261120000400_enrolled_visibility.sql` | Estudiantes ven sus cursos aunque estén ocultos del catálogo |
| `migrations/20261120000500_admin_support.sql` | Pagos manuales (quién y cuándo), bitácora y matrículas consecutivas |
| `migrations/20261121000600_docentes.sql` | Portal de docentes: dueños de cursos, revisión, docentes por grupo, solicitudes, reparto automático de cada pago (trigger) y cortes quincenales |
| `migrations/20261121000700_constancias.sql` | Avance por clase, constancias con folio y rutas de aprendizaje (sellos) |
| `migrations/20261121000800_tienda.sql` | Tienda: productos, compras y buckets de Storage (`ebooks` privado, `portadas` público) |
| `migrations/20261120000300_sync_from_legacy.sql` | `app.sync_from_legacy()` copia `public` → `app` (idempotente) y `app.validate_migration()` compara conteos |
| `../scripts/crear-cuentas-auth.mjs` | Crea una cuenta de Supabase Auth por estudiante con su misma contraseña |
| `tests/` | Pruebas locales con datos ficticios (`02_pruebas.sql` y `03_docentes.sql`) |

## Decisiones aplicadas

- Mismos `id` y matrículas. Matrículas nuevas: numéricas desde 10000.
- Contraseñas: se guardan solo cifradas (bcrypt) y se importan a Supabase Auth; las de menos de 6 caracteres obligan a crear una nueva al entrar.
- Estudiantes sin correo: cuenta con correo técnico interno `alumno-{id}@acceso.espiritistasacantar.com`; entran con teléfono o matrícula.
- Correos repetidos: lo conserva el registro más antiguo; el resto queda en `app.migration_issues`.
- Acceso permanente (se ignora `grupos.duracion_acceso`); se pausa si hay una cuota vencida.
- Tandas: no se migran; sus tablas se borran el día del corte, después del respaldo.

## Ensayo en staging (antes de tocar producción)

1. Crear un proyecto de Supabase de staging y restaurar una copia de producción.
2. En el SQL Editor de staging, correr en orden los tres archivos de `migrations/`.
3. `select * from app.sync_from_legacy();`
4. `select * from app.validate_migration();` → todo debe decir `ok`.
5. `select entity, issue, count(*) from app.migration_issues group by 1, 2;` → revisar los casos a mano.
6. Settings → API → Exposed schemas: agregar `app`.
7. `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/crear-cuentas-auth.mjs` (simulación) y luego con `--ejecutar`.
8. Probar el login de 20 estudiantes en staging.

## Pruebas locales

```bash
createdb eac_test
psql -d eac_test -f supabase/tests/00_supabase_stub.sql
psql -d eac_test -f supabase/tests/esquema_public_actual_ejecutable.sql
psql -d eac_test -f supabase/tests/01_datos_legacy_prueba.sql
for f in supabase/migrations/*.sql; do psql -d eac_test -f "$f"; done
psql -d eac_test -c "select * from app.sync_from_legacy()"
psql -d eac_test -f supabase/tests/02_pruebas.sql   # debe terminar en "TODAS LAS PRUEBAS PASARON"
psql -d eac_test -f supabase/tests/03_docentes.sql  # "PRUEBAS DE DOCENTES PASARON"
psql -d eac_test -f supabase/tests/04_constancias.sql  # "PRUEBAS DE CONSTANCIAS PASARON"
psql -d eac_test -f supabase/tests/05_tienda.sql  # "PRUEBAS DE TIENDA PASARON"
```
