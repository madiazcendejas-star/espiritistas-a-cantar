export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/mi-espacio', '/docente', '/entrar'] }] }
}
