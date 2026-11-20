# Parche de seguridad urgente

Rama: `seguridad/parche-urgente`

## Qué corrige

1. **`/admin` protegido en el servidor** (`middleware.js`): pide usuario y contraseña antes de mostrar cualquier página de administración.
2. **Se quitó la contraseña de administrador del código** (`app/page.js`). Escribir `admin` en el login ahora lleva a `/admin`, que pide las credenciales del servidor.
3. **Login de estudiantes en el servidor** (`/api/login`): el navegador ya no descarga la tabla `alumnos` completa ni las contraseñas. Se sigue entrando igual: teléfono, matrícula o correo + contraseña. El teléfono también se reconoce con espacios o con `+52`.
4. **Cambio de contraseña verificado** (`/api/cambiar-password`): ahora pide la contraseña actual.

No cambia la base de datos ni los accesos de nadie.

## Antes de desplegar (en Vercel → Settings → Environment Variables)

| Variable | Valor |
| --- | --- |
| `ADMIN_USER` | Usuario de administración (nuevo) |
| `ADMIN_PASSWORD` | Contraseña larga y nueva (no reutilizar la anterior) |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya debería existir (la usa el webhook de Stripe) |

Sin `ADMIN_USER` y `ADMIN_PASSWORD`, `/admin` responde "deshabilitado" (falla cerrado a propósito).

## Pruebas después de desplegar

- Abrir `/admin` en una ventana privada: debe pedir usuario y contraseña.
- Entrar como estudiante con teléfono + contraseña, con matrícula y con correo.
- Cambiar la contraseña desde el portal pidiendo la actual.

## Lo que este parche NO cierra todavía

Las páginas de administración y del portal consultan Supabase desde el navegador con la clave pública, así que las tablas siguen accesibles para alguien con conocimientos técnicos. Cerrarlo requiere activar RLS y mover esas consultas al servidor; se hace en la nueva versión (Fase 1 y 2 del plan) junto con la migración a Supabase Auth.
