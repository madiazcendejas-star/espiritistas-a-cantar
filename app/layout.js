import './globals.css'

// Quicksand se carga desde Google Fonts en el navegador (no durante la compilación),
// para que una falla momentánea de Google no rompa el deploy.
const FUENTE = 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap'

export const metadata = {
  title: { default: 'EAC Academia', template: '%s · EAC Academia' },
  description:
    'Cursos y talleres de desarrollo espiritual, terapias alternativas y artes holísticas. Clases en vivo, cursos grabados y materiales descargables.',
  icons: { icon: '/logo-eac.png' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2e1840',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FUENTE} />
      </head>
      <body>{children}</body>
    </html>
  )
}
