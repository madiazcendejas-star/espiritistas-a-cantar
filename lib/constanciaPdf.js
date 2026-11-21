import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
// Generador de QR (MIT, Kazuhiko Arase) que trae el paquete qrcode-terminal.
import QRCode from 'qrcode-terminal/vendor/QRCode/index.js'
import QRLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel.js'

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const mezcla = (a, b, t) => rgb(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t)
const NOCHE = hex('#170b2e'), VIOLETA = hex('#3d1c78'), MORADO = hex('#6e3fc3'), LILA = hex('#cbb8f0'), LILA2 = hex('#9f88c9')
const DORADO = hex('#e2b85c'), BLANCO = rgb(1, 1, 1), TINTA = hex('#2d193b'), GRIS = hex('#6f6a77')

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fechaLarga = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}` }
const PERMITIDOS = /[ -~¡-ÿ]/
const limpio = (s) => [...String(s || '').normalize('NFC')].filter((ch) => PERMITIDOS.test(ch)).join('').trim()
const ajustar = (t, f, s, max, min = 14) => { while (s > min && f.widthOfTextAtSize(t, s) > max) s -= 1; return s }
function enLineas(t, f, s, max) {
  if (f.widthOfTextAtSize(t, s) <= max) return [t]
  const p = t.split(' '); let a = ''
  for (let i = 0; i < p.length; i++) { const x = a ? `${a} ${p[i]}` : p[i]; if (f.widthOfTextAtSize(x, s) > max) return [a, p.slice(i).join(' ')]; a = x }
  return [a]
}
// Rectángulo con esquinas redondeadas (en coordenadas de PDF, origen abajo a la izquierda).
function redondeado(page, x, y, w, h, r, opts) {
  const H = page.getHeight()
  const top = H - (y + h)
  const d = `M ${x + r} ${top} H ${x + w - r} Q ${x + w} ${top} ${x + w} ${top + r} V ${top + h - r} Q ${x + w} ${top + h} ${x + w - r} ${top + h} H ${x + r} Q ${x} ${top + h} ${x} ${top + h - r} V ${top + r} Q ${x} ${top} ${x + r} ${top} Z`
  page.drawSvgPath(d, { x: 0, y: H, ...opts })
}
function qr(page, texto, x, y, tam, color) {
  const q = new QRCode(-1, QRLevel.M); q.addData(texto); q.make()
  const n = q.getModuleCount(); const m = tam / n
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) page.drawRectangle({ x: x + c * m, y: y + tam - (r + 1) * m, width: m + 0.15, height: m + 0.15, color })
}
function palomita(page, x, y, s, color) {
  const H = page.getHeight()
  page.drawSvgPath(`M ${x} ${H - y} L ${x + s * 0.38} ${H - y + s * 0.38} L ${x + s} ${H - y - s * 0.42}`, { x: 0, y: H, borderColor: color, borderWidth: 1.8 })
}

export async function crearConstanciaPdf(c, { firmaNombre, firmaCargo, urlVerificacion, urlCatalogo }) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Constancia ${c.folio} · EAC Academia`); pdf.setAuthor('EAC Academia'); pdf.setSubject(limpio(c.course_title))
  const page = pdf.addPage([792, 612]); const W = 792, H = 612
  const S = await pdf.embedFont(StandardFonts.Helvetica), SB = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Fondo: degradado nocturno con destellos suaves
  for (let i = 0; i < 160; i++) page.drawRectangle({ x: 0, y: H - (i + 1) * 3.84, width: W, height: 4.2, color: mezcla(VIOLETA, NOCHE, i / 159) })
  page.drawCircle({ x: 690, y: 600, size: 230, color: MORADO, opacity: 0.28 })
  page.drawCircle({ x: 760, y: 520, size: 120, color: hex('#8f5fe0'), opacity: 0.18 })
  page.drawCircle({ x: 40, y: 10, size: 170, color: MORADO, opacity: 0.22 })
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: DORADO })

  // Marca y sello de autenticidad
  page.drawText('EAC', { x: 56, y: 548, size: 22, font: SB, color: BLANCO })
  page.drawText('ACADEMIA', { x: 56 + SB.widthOfTextAtSize('EAC', 22) + 8, y: 548, size: 11, font: S, color: LILA, characterSpacing: 3 })
  page.drawText('Antes Espiritistas a Cantar', { x: 56, y: 532, size: 8, font: S, color: LILA2 })
  const pill = 'CERTIFICADO AUTÉNTICO'; const pw = SB.widthOfTextAtSize(pill, 8.5) + 1.2 * pill.length + 44
  redondeado(page, W - 56 - pw, 536, pw, 26, 13, { color: BLANCO, opacity: 0.1, borderColor: DORADO, borderWidth: 0.9 })
  palomita(page, W - 56 - pw + 14, 549, 9, DORADO)
  page.drawText(pill, { x: W - 56 - pw + 30, y: 545.5, size: 8.5, font: SB, color: DORADO, characterSpacing: 1.2 })

  // Contenido principal
  const X = 56, ANCHO = 450
  page.drawText('CONSTANCIA DE CONCLUSIÓN', { x: X, y: 452, size: 10, font: SB, color: DORADO, characterSpacing: 2.6 })
  const nombre = limpio(c.full_name) || 'Estudiante'
  // Una línea si cabe en 30 pt o más; si no, dos líneas.
  const unaLinea = ajustar(nombre, SB, 38, ANCHO, 30)
  const nl = SB.widthOfTextAtSize(nombre, unaLinea) <= ANCHO ? [nombre] : enLineas(nombre, SB, 30, ANCHO)
  const sN = nl.length > 1 ? 30 : unaLinea
  nl.forEach((l, i) => page.drawText(l, { x: X, y: 404 - i * (sN + 2), size: sN, font: SB, color: BLANCO }))
  let y = 404 - (nl.length - 1) * (sN + 2) - 34
  page.drawText('concluyó satisfactoriamente el curso', { x: X, y, size: 13, font: S, color: LILA })
  const cl = enLineas(limpio(c.course_title), SB, 22, ANCHO); const sC = cl.length > 1 ? 18 : 22
  y -= 32; cl.forEach((l, i) => page.drawText(l, { x: X, y: y - i * (sC + 3), size: sC, font: SB, color: BLANCO }))
  y -= (cl.length - 1) * (sC + 3) + 20
  if (c.group_name) page.drawText(limpio(c.group_name), { x: X, y, size: 11.5, font: S, color: LILA2 })

  // Datos
  const datos = [['MATRÍCULA', limpio(c.matricula) || '-'], ['FECHA', fechaLarga(c.issued_on)], ['FOLIO', c.folio]]
  datos.forEach(([k, v], i) => {
    const dx = X + i * 150
    page.drawText(k, { x: dx, y: 186, size: 7.5, font: SB, color: LILA2, characterSpacing: 1.6 })
    page.drawText(v, { x: dx, y: 170, size: 11.5, font: i === 2 ? SB : S, color: BLANCO })
  })
  page.drawLine({ start: { x: X, y: 150 }, end: { x: X + ANCHO, y: 150 }, thickness: 0.5, color: LILA2, opacity: 0.4 })
  page.drawText(limpio(firmaNombre) || 'Dirección Académica', { x: X, y: 124, size: 11.5, font: SB, color: BLANCO })
  page.drawText(limpio(firmaCargo) || 'EAC Academia', { x: X, y: 110, size: 9.5, font: S, color: LILA })

  // Tarjeta del QR
  const cx = 556, cw = 180, cy = 150, ch = 270
  redondeado(page, cx, cy, cw, ch, 18, { color: BLANCO })
  qr(page, urlVerificacion, cx + 22, cy + 92, 136, TINTA)
  const centrar = (t, f, s, yy, col) => page.drawText(t, { x: cx + (cw - f.widthOfTextAtSize(t, s)) / 2, y: yy, size: s, font: f, color: col })
  centrar('Escanea para verificar', SB, 10.5, cy + 66, TINTA)
  centrar('que es auténtica', S, 9.5, cy + 52, GRIS)
  centrar(c.folio, SB, 9, cy + 26, MORADO)

  // Invitación al catálogo
  redondeado(page, 56, 40, W - 112, 44, 22, { color: BLANCO, opacity: 0.08, borderColor: LILA2, borderWidth: 0.5, borderOpacity: 0.5 })
  page.drawText('Tu camino sigue.', { x: 78, y: 57, size: 11, font: SB, color: DORADO })
  const inv = 'Descubre más cursos y talleres en'
  page.drawText(inv, { x: 78 + SB.widthOfTextAtSize('Tu camino sigue.', 11) + 8, y: 57, size: 11, font: S, color: BLANCO })
  const cat = limpio(urlCatalogo)
  page.drawText(cat, { x: W - 78 - SB.widthOfTextAtSize(cat, 11), y: 57, size: 11, font: SB, color: BLANCO })

  return pdf.save()
}
