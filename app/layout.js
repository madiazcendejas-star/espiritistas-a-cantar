import { Quicksand } from 'next/font/google'
import './globals.css'

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-quicksand',
  display: 'swap',
})

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
    <html lang="es-MX" className={quicksand.variable}>
      <body>{children}</body>
    </html>
  )
}
