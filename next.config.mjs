/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Ligas de la app anterior (favoritos, WhatsApp, anuncios) siguen funcionando.
  async redirects() {
    const r = (source, destination) => ({ source, destination, permanent: false })
    return [
      r('/login', '/entrar'),
      r('/alumno', '/mi-espacio'),
      r('/alumno/pagos', '/mi-espacio/pagos'),
      r('/alumnos', '/mi-espacio'),
      r('/mis-cursos', '/mi-espacio/cursos'),
      r('/mis-cursos/:ruta*', '/mi-espacio/cursos'),
      r('/admin/estudiantes/detalle', '/admin/estudiantes'),
      r('/admin/grupos', '/admin/cursos'),
      r('/admin/:vieja(calendario|comprobantes|tandas|inscripciones|prospectos)', '/admin'),
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
