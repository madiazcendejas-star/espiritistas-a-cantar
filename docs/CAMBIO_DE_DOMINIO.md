# Cambio a EAC Academia v2 en espiritistasacantar.com

El dominio ya está conectado a este proyecto de Vercel, y producción publica la rama `main`.
**No hay que tocar el DNS:** el cambio consiste en unir `v2/app` a `main`. Si algo sale mal,
se regresa a la app anterior con *Instant Rollback* de Vercel en un clic.

Los datos actuales (`public`) no se modifican: la versión nueva lee y escribe en el esquema `app`
del mismo proyecto de Supabase.

## A. Preparación (días antes, los estudiantes no notan nada)

### A1. Supabase de producción
1. SQL Editor → correr en orden los cinco archivos de `supabase/migrations/` (por nombre).
2. Settings → Data API → Exposed schemas: agregar `app`.
3. `select * from app.sync_from_legacy();`
4. `select * from app.validate_migration();` → todo `ok`.
5. `select entity, issue, count(*) from app.migration_issues group by 1, 2;` → revisar casos.
6. **No** crear todavía las cuentas de acceso: se crean el día del cambio, para incluir las
   contraseñas que cambien mientras tanto.

### A2. Stripe (cuenta real)
1. OXXO activado (hecho el 20 nov 2026).
2. Developers → Webhooks → Add destination: `https://espiritistasacantar.com/api/webhook`, eventos
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`. Copiar el *Signing secret* (`whsec_…`).

### A3. Vercel → Environment Variables → **Production**
Solo aplican cuando se publique la versión nueva; la app actual no cambia.

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ya existe (proyecto de producción) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Agregar**: clave `sb_publishable_…` de producción |
| `SUPABASE_SECRET_KEY` | **Verificar** que sea la `sb_secret_…` de **producción** (no la de staging); si hay duda, borrarla y crearla de nuevo |
| `STRIPE_SECRET_KEY` | **Reemplazar** por la `sk_live_…` (hoy tiene la de prueba) |
| `STRIPE_WEBHOOK_SECRET` | **Reemplazar** por el `whsec_…` del paso A2 |
| `RESEND_API_KEY` | Ya existe |
| `NEXT_PUBLIC_SITE_URL` | Ya existe: `https://espiritistasacantar.com` |
| `STRIPE_PRICE_ID_BARAJA` | Borrar o dejar: si existe, debe ser un precio **live**; sin ella se cobra el precio del grupo |

### A4. Pull request `v2/app` → `main`
Crear el PR y dejarlo listo **sin unir**. Vercel muestra su vista previa.

## B. Día del cambio (hora tranquila, ~1 hora)

1. **Avisar** en los grupos de WhatsApp que habrá mantenimiento de 1 hora.
2. **Congelar**: no registrar altas ni pagos en la app anterior a partir de este momento.
3. **Respaldo** de la base de producción (`pg_dump` completo, como en el ensayo de staging).
4. **Última sincronización**: `select * from app.sync_from_legacy();` y
   `select * from app.validate_migration();`.
5. **Cuentas de acceso**: `node scripts/crear-cuentas-auth.mjs` (simulación) y luego `--ejecutar`.
   Crea las que falten y actualiza las contraseñas que cambiaron.
6. **Unir el PR** a `main`. Vercel publica la versión nueva en el dominio (1–2 minutos).
7. **Pruebas en el dominio real**:
   - Entrar con teléfono, con matrícula y con correo de 3 estudiantes reales.
   - Ver un curso, una clase grabada y un PDF.
   - `/admin`: buscar un estudiante y registrar un pago manual de prueba (luego cancelarlo).
   - Compra real con tarjeta de un grupo barato y reembolsarla desde Stripe.
   - Ligas viejas: `/login`, `/mis-cursos`, `/cursos/baraja-espanola`.
8. **Avisar a los estudiantes** (mensaje abajo).

### Si algo sale mal
Vercel → Deployments → la publicación anterior de producción → **Instant Rollback**.
La app anterior vuelve en segundos con sus datos intactos. Lo que se haya registrado en la
versión nueva durante esos minutos queda en `app` y se revisa a mano.

### Mensaje para estudiantes
> ¡Hola! Estrenamos nueva plataforma de EAC Academia 💜 Entra como siempre en
> espiritistasacantar.com con tu mismo teléfono y contraseña. Ahora puedes ver tus clases y
> materiales dentro de la página y pagar tus cuotas con tarjeta u OXXO. Si tienes cualquier duda,
> escríbenos por aquí.

## C. Después del cambio
- Primera semana: revisar a diario Vercel → Logs y Stripe → Webhooks (errores).
- Tras 1–2 semanas estable: borrar las tablas de tandas (después de otro respaldo).
- Desactivar en el entorno de prueba de Stripe el webhook que apunta al dominio real.
- Siguientes mejoras: liga de pago por WhatsApp, botón de ayuda, recuperar contraseña,
  portal de docentes, video con Mux, constancias.
