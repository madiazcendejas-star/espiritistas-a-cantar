# EAC Academia v2

Next.js (App Router) + Supabase. Diseño basado en el prototipo de Figma Make: Quicksand, fondo `#F5F5F7`, acento `#6E3FC3`.

> Esta rama (`v2/app`) reemplaza a la app anterior. La app actual sigue en `main` hasta el día del cambio.

## Rutas

| Ruta | Quién | Qué es |
| --- | --- | --- |
| `/` | Todos | Home con menú Estudiante · Docente · Iniciar sesión |
| `/cursos`, `/cursos/[id]` | Todos | Catálogo y ficha del curso con selector de fecha y modalidad (grupos) |
| `/docentes` | Todos | Invitación a enseñar en EAC |
| `/entrar` | Todos | Login con teléfono, matrícula o correo + contraseña |
| `/entrar/nueva-contrasena` | Con sesión | Obligatorio si la contraseña heredada es corta |
| `/mi-espacio/*` | Estudiantes | Panel (celular primero): cursos, en vivo, pagos, perfil |
| `/docente/*` | Docentes | Portal docente (computadora primero): cursos propios con revisión, grupos asignados, materiales y clases, estudiantes, ganancias y perfil |
| `/mi-espacio/logros` | Estudiantes | Constancias (PDF) y sellos de rutas de aprendizaje |
| `/constancia/[folio]` | Todos | Verificación pública del folio de una constancia |
| `/api/constancias/[folio]` | Dueño, admin o docente | Descarga del PDF de la constancia |
| `/docentes/solicitud` | Todos | Solicitud para ser docente (crea la cuenta si no tiene) |
| `/admin` | Administración | No aparece en el menú; exige rol `admin` |
| `/gracias` | Todos | Regreso de Stripe: confirma el pago y, si la cuenta es nueva, pide crear contraseña |
| `/cursos/baraja-espanola` | Todos | Liga de la app anterior; redirige al curso del grupo de Baraja |
| `/api/checkout` | Todos | Compatible con la landing anterior: `POST { grupo_id }` → `{ url }` |
| `/api/webhook` | Stripe | Misma ruta que la app anterior: el endpoint en Stripe no cambia |

## Variables de entorno

| Variable | Dónde | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente y servidor | Clave `sb_publishable_…` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | Solo servidor | Clave `sb_secret_…` (o `SUPABASE_SERVICE_ROLE_KEY`) |
| `STRIPE_SECRET_KEY` | Solo servidor | `sk_test_…` en vistas previas, `sk_live_…` en producción |
| `STRIPE_WEBHOOK_SECRET` | Solo servidor | `whsec_…` del endpoint `/api/webhook` |
| `RESEND_API_KEY` | Solo servidor | Correo de bienvenida después de la compra (opcional) |
| `NEXT_PUBLIC_SITE_URL` | Servidor | `https://espiritistasacantar.com` (solo se usa en producción) |
| `STRIPE_PRICE_ID_BARAJA` | Solo servidor | Opcional: precio fijo de Stripe para el grupo de Baraja. Sin ella se cobra el precio del grupo |
| `BARAJA_GRUPO_ID` | Solo servidor | Opcional, por defecto `5` |
| `CORREO_AVISOS_ADMIN` | Solo servidor | Opcional: correo(s) separados por coma que reciben avisos de solicitudes y cursos por revisar |

### Pagos en línea

- **Inscripción** (`/cursos/[id]` → Inscribirme): si el grupo es a plazos se cobra la primera cuota y las demás quedan pendientes en *Mis pagos*, una por mes. Si quien compra no tiene sesión, se le crea perfil y cuenta con su correo, y en `/gracias` elige su contraseña.
- **Cuotas** (*Mis pagos* → Pagar): marca la cuota como pagada; si estaba vencida, el acceso se reactiva solo.
- Métodos: los que estén activos en Stripe (Dashboard → Settings → Payment methods). Tarjeta y OXXO funcionan sin más; SPEI aparece para quien tiene correo real.
- Se registra tanto desde el webhook como desde `/gracias`; es idempotente (`stripe_payment_id` único). OXXO y SPEI se confirman con `checkout.session.async_payment_succeeded`.
- Eventos del webhook: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`.

En Vercel, las vistas previas de esta rama deben apuntar a **staging** (variables de Preview limitadas a la rama `v2/app`).

## Supabase

Ver `supabase/README.md`. Requiere el esquema `app` expuesto en Settings → Data API.
