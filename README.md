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
| `/docente` | Docentes | Portal (en construcción) |
| `/admin` | Administración | No aparece en el menú; exige rol `admin` |

## Variables de entorno

| Variable | Dónde | Valor |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente y servidor | Clave `sb_publishable_…` (o `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SECRET_KEY` | Solo servidor | Clave `sb_secret_…` (o `SUPABASE_SERVICE_ROLE_KEY`) |

En Vercel, las vistas previas de esta rama deben apuntar a **staging** (variables de Preview limitadas a la rama `v2/app`).

## Supabase

Ver `supabase/README.md`. Requiere el esquema `app` expuesto en Settings → Data API.
