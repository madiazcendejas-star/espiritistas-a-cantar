import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
// Generador de QR (MIT, Kazuhiko Arase) que trae el paquete qrcode-terminal.
import QRCode from 'qrcode-terminal/vendor/QRCode/index.js'
import QRLevel from 'qrcode-terminal/vendor/QRCode/QRErrorCorrectLevel.js'

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const mezcla = (a, b, t) => rgb(a.red + (b.red - a.red) * t, a.green + (b.green - a.green) * t, a.blue + (b.blue - a.blue) * t)
const MORADO = hex('#6e3fc3'), PROFUNDO = hex('#2a1257'), MEDIO = hex('#4a2596'), LILA = hex('#d9cbf5'), LILA2 = hex('#a892d6')
const ORO = hex('#c9a04e'), ORO2 = hex('#e8c879'), TINTA = hex('#24152f'), GRIS = hex('#77707f'), LINEA = hex('#e4dcef'), BLANCO = rgb(1, 1, 1)

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fechaLarga = (iso) => { const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${y}` }
// Las fuentes estándar del PDF solo tienen caracteres latinos (WinAnsi).
const PERMITIDOS = /[ -~¡-ÿ]/
const limpio = (s) => [...String(s || '').normalize('NFC')].filter((ch) => PERMITIDOS.test(ch)).join('').trim()
const ajustar = (t, f, s, max, min) => { while (s > min && f.widthOfTextAtSize(t, s) > max) s -= 0.5; return s }
function enLineas(t, f, s, max) {
  if (f.widthOfTextAtSize(t, s) <= max) return [t]
  const p = t.split(' '); let a = ''
  for (let i = 0; i < p.length; i++) { const x = a ? `${a} ${p[i]}` : p[i]; if (f.widthOfTextAtSize(x, s) > max) return [a, p.slice(i).join(' ')]; a = x }
  return [a]
}
function redondeado(page, x, y, w, h, r, opts) {
  const H = page.getHeight(), t = H - (y + h)
  page.drawSvgPath(`M ${x + r} ${t} H ${x + w - r} Q ${x + w} ${t} ${x + w} ${t + r} V ${t + h - r} Q ${x + w} ${t + h} ${x + w - r} ${t + h} H ${x + r} Q ${x} ${t + h} ${x} ${t + h - r} V ${t + r} Q ${x} ${t} ${x + r} ${t} Z`, { x: 0, y: H, ...opts })
}
function qr(page, texto, x, y, tam, color) {
  const q = new QRCode(-1, QRLevel.M); q.addData(texto); q.make()
  const n = q.getModuleCount(), m = tam / n
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) page.drawRectangle({ x: x + c * m, y: y + tam - (r + 1) * m, width: m + 0.2, height: m + 0.2, color })
}
// Sello dorado tipo roseta
function sello(page, cx, cy, r, fuentes) {
  const H = page.getHeight()
  const pts = Array.from({ length: 48 }, (_, i) => { const a = (i * Math.PI) / 24, rr = i % 2 ? r * 0.9 : r; return `${cx + rr * Math.cos(a)} ${H - (cy + rr * Math.sin(a))}` })
  page.drawSvgPath(`M ${pts.join(' L ')} Z`, { x: 0, y: H, color: ORO })
  page.drawCircle({ x: cx, y: cy, size: r * 0.8, color: ORO2 })
  page.drawCircle({ x: cx, y: cy, size: r * 0.72, borderColor: ORO, borderWidth: 0.8 })
  page.drawCircle({ x: cx, y: cy, size: r * 0.56, borderColor: ORO, borderWidth: 0.5 })
  const t1 = 'EAC', t2 = 'AUTÉNTICO'
  page.drawText(t1, { x: cx - fuentes.b.widthOfTextAtSize(t1, r * 0.36) / 2, y: cy - r * 0.08, size: r * 0.36, font: fuentes.b, color: PROFUNDO })
  page.drawText(t2, { x: cx - fuentes.b.widthOfTextAtSize(t2, r * 0.13) / 2 - 0.5, y: cy - r * 0.3, size: r * 0.13, font: fuentes.b, color: PROFUNDO, characterSpacing: 0.6 })
}

export async function crearConstanciaPdf(c, { firmaNombre, firmaCargo, docente, urlVerificacion }) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Constancia ${c.folio} · EAC Academia`); pdf.setAuthor('EAC Academia'); pdf.setSubject(limpio(c.course_title))
  const page = pdf.addPage([792, 612]); const W = 792, H = 612
  const f = {
    s: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold),
    serif: await pdf.embedFont(StandardFonts.TimesRoman), serifB: await pdf.embedFont(StandardFonts.TimesRomanBold), serifI: await pdf.embedFont(StandardFonts.TimesRomanItalic),
  }

  // ---- Mitad morada (izquierda) ----
  const P = 300
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: BLANCO })
  for (let i = 0; i < 150; i++) page.drawRectangle({ x: 0, y: H - (i + 1) * 4.08, width: P, height: 4.5, color: mezcla(MEDIO, PROFUNDO, i / 149) })
  page.drawCircle({ x: 30, y: H - 10, size: 150, color: MORADO, opacity: 0.35 })
  page.drawCircle({ x: 170, y: 20, size: 100, color: MORADO, opacity: 0.25 })
  page.drawRectangle({ x: P, y: 0, width: 4, height: H, color: ORO })

  page.drawText('EAC', { x: 44, y: 540, size: 30, font: f.b, color: BLANCO })
  page.drawText('A C A D E M I A', { x: 44, y: 522, size: 9.5, font: f.s, color: LILA })
  page.drawRectangle({ x: 44, y: 506, width: 34, height: 2, color: ORO2 })
  page.drawText('Formación en espiritualidad,', { x: 44, y: 486, size: 9.5, font: f.s, color: LILA2 })
  page.drawText('sanación y artes holísticas', { x: 44, y: 473, size: 9.5, font: f.s, color: LILA2 })

  // QR en tarjeta blanca
  const qx = 44, qy = 176, qt = 132
  redondeado(page, qx, qy, qt + 28, qt + 28, 14, { color: BLANCO })
  qr(page, urlVerificacion, qx + 14, qy + 14, qt, PROFUNDO)
  page.drawText('VALIDA SU AUTENTICIDAD', { x: 44, y: 152, size: 8.5, font: f.b, color: ORO2, characterSpacing: 1.4 })
  page.drawText('Escanea el código o visita', { x: 44, y: 137, size: 9, font: f.s, color: LILA })
  const urlCorta = limpio(urlVerificacion.replace(/^https?:\/\//, ''))
  const partes = urlCorta.length > 34 ? [urlCorta.slice(0, urlCorta.indexOf('/constancia') + 1), urlCorta.slice(urlCorta.indexOf('/constancia') + 1)] : [urlCorta]
  partes.forEach((t, i) => page.drawText(t, { x: 44, y: 123 - i * 12, size: 9, font: f.b, color: BLANCO }))

  page.drawText('FOLIO', { x: 44, y: 66, size: 7.5, font: f.b, color: LILA2, characterSpacing: 1.6 })
  page.drawText(c.folio, { x: 44, y: 50, size: 13, font: f.b, color: BLANCO })

  // ---- Mitad blanca (derecha) ----
  const MARCO_X = P + 38, MARCO_D = W - 22
  const X = MARCO_X + 34, ANCHO = MARCO_D - 34 - X
  const centro = X + ANCHO / 2
  const cen = (t, font, size, y, color, extra = {}) => page.drawText(t, { x: centro - (font.widthOfTextAtSize(t, size) + (extra.characterSpacing || 0) * (t.length - 1)) / 2, y, size, font, color, ...extra })
  page.drawRectangle({ x: MARCO_X, y: 22, width: MARCO_D - MARCO_X, height: H - 44, borderColor: LINEA, borderWidth: 0.8 })
  page.drawRectangle({ x: MARCO_X + 5, y: 27, width: MARCO_D - MARCO_X - 10, height: H - 54, borderColor: LINEA, borderWidth: 0.4 })

  cen('CONSTANCIA DE CONCLUSIÓN', f.b, 10, 506, MORADO, { characterSpacing: 2.6 })
  cen('EAC Academia otorga la presente a', f.serifI, 14, 466, GRIS)

  const nombre = limpio(c.full_name) || 'Estudiante'
  const s1 = ajustar(nombre, f.serifB, 38, ANCHO, 28)
  const nl = f.serifB.widthOfTextAtSize(nombre, s1) <= ANCHO ? [nombre] : enLineas(nombre, f.serifB, 28, ANCHO)
  const sN = nl.length > 1 ? 28 : s1
  let y = 414
  nl.forEach((l, i) => cen(l, f.serifB, sN, y - i * (sN + 4), TINTA))
  y -= (nl.length - 1) * (sN + 4) + 18
  page.drawLine({ start: { x: centro - 90, y }, end: { x: centro + 90, y }, thickness: 1, color: ORO })
  page.drawCircle({ x: centro, y, size: 2.6, color: ORO })

  y -= 30
  cen('por haber concluido satisfactoriamente el programa', f.serif, 13.5, y, GRIS)
  const cl = enLineas(limpio(c.course_title), f.b, 21, ANCHO); const sC = cl.length > 1 ? 17 : 21
  y -= 32
  cl.forEach((l, i) => cen(l, f.b, sC, y - i * (sC + 4), MORADO))
  y -= (cl.length - 1) * (sC + 4) + 20
  if (c.group_name) cen(limpio(c.group_name), f.serifI, 12.5, y, GRIS)

  cen(`Ciudad de México, ${fechaLarga(c.issued_on)}  ·  Matrícula ${limpio(c.matricula) || '-'}`, f.s, 10, 176, GRIS)

  // Firmas (una o dos)
  const firmas = [[limpio(firmaNombre) || 'Dirección Académica', limpio(firmaCargo) || 'EAC Academia']]
  if (docente) firmas.push([limpio(docente), 'Docente del programa'])
  const ancho = firmas.length > 1 ? 158 : 190, sep = firmas.length > 1 ? 34 : 0
  const x0 = centro - (firmas.length * ancho + sep * (firmas.length - 1)) / 2
  firmas.forEach(([n, cargo], i) => {
    const fx = x0 + i * (ancho + sep), mid = fx + ancho / 2
    page.drawLine({ start: { x: fx, y: 116 }, end: { x: fx + ancho, y: 116 }, thickness: 0.8, color: TINTA })
    page.drawText(n, { x: mid - f.b.widthOfTextAtSize(n, 10.5) / 2, y: 101, size: 10.5, font: f.b, color: TINTA })
    page.drawText(cargo, { x: mid - f.s.widthOfTextAtSize(cargo, 9) / 2, y: 88, size: 9, font: f.s, color: GRIS })
  })

  // Sello dorado sobre la unión de las dos mitades
  sello(page, P + 2, 300, 46, f)
  return pdf.save()
}
