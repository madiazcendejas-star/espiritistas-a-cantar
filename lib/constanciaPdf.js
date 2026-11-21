import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const MORADO = rgb(110 / 255, 63 / 255, 195 / 255)
const TINTA = rgb(45 / 255, 25 / 255, 59 / 255)
const GRIS = rgb(111 / 255, 106 / 255, 119 / 255)
const DORADO = rgb(178 / 255, 132 / 255, 48 / 255)
const LILA = rgb(239 / 255, 233 / 255, 249 / 255)

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const fechaLarga = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${y}`
}

// Las fuentes estándar del PDF solo tienen caracteres latinos (WinAnsi):
// cualquier otro símbolo se quita para que nunca falle la generación.
const PERMITIDOS = /[ -~¡-ÿ]/
const limpio = (s) => [...String(s || '').normalize('NFC')].filter((ch) => PERMITIDOS.test(ch)).join('').trim()

function centrado(page, texto, y, font, size, color) {
  const w = font.widthOfTextAtSize(texto, size)
  page.drawText(texto, { x: (page.getWidth() - w) / 2, y, size, font, color })
}

// Reduce el tamaño hasta que el texto quepa en el ancho dado.
function ajustar(texto, font, size, max, min = 14) {
  let s = size
  while (s > min && font.widthOfTextAtSize(texto, s) > max) s -= 1
  return s
}

// Divide un texto largo en hasta 2 líneas.
function enLineas(texto, font, size, max) {
  if (font.widthOfTextAtSize(texto, size) <= max) return [texto]
  const palabras = texto.split(' ')
  let a = ''
  for (let i = 0; i < palabras.length; i++) {
    const prueba = a ? `${a} ${palabras[i]}` : palabras[i]
    if (font.widthOfTextAtSize(prueba, size) > max) return [a, palabras.slice(i).join(' ')]
    a = prueba
  }
  return [a]
}

export async function crearConstanciaPdf(c, { firmaNombre, firmaCargo, urlVerificacion }) {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Constancia ${c.folio}`)
  pdf.setAuthor('EAC Academia')
  pdf.setSubject(limpio(c.course_title))
  const page = pdf.addPage([792, 612]) // Carta horizontal
  const W = page.getWidth()
  const H = page.getHeight()

  const serif = await pdf.embedFont(StandardFonts.TimesRoman)
  const serifB = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const serifI = await pdf.embedFont(StandardFonts.TimesRomanItalic)
  const sans = await pdf.embedFont(StandardFonts.Helvetica)
  const sansB = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Marco
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) })
  page.drawRectangle({ x: 24, y: 24, width: W - 48, height: H - 48, borderColor: MORADO, borderWidth: 2.2 })
  page.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: DORADO, borderWidth: 0.7 })
  for (const [x, y] of [[32, 32], [W - 32, 32], [32, H - 32], [W - 32, H - 32]]) {
    page.drawCircle({ x, y, size: 5, color: DORADO })
  }

  // Encabezado
  page.drawCircle({ x: W / 2, y: H - 92, size: 26, color: LILA, borderColor: MORADO, borderWidth: 1.2 })
  centrado(page, 'EAC', H - 98, sansB, 15, MORADO)
  centrado(page, 'E A C   A C A D E M I A', H - 140, sansB, 10, MORADO)
  centrado(page, 'Antes Espiritistas a Cantar', H - 154, sans, 8.5, GRIS)

  centrado(page, 'CONSTANCIA', H - 205, serifB, 38, TINTA)
  centrado(page, 'Se otorga la presente a', H - 238, serifI, 15, GRIS)

  // Nombre
  const nombre = limpio(c.full_name) || 'Estudiante'
  const sNombre = ajustar(nombre, serifB, 34, W - 180, 20)
  centrado(page, nombre, H - 284, serifB, sNombre, MORADO)
  const wLinea = Math.min(W - 200, serifB.widthOfTextAtSize(nombre, sNombre) + 60)
  page.drawLine({ start: { x: (W - wLinea) / 2, y: H - 296 }, end: { x: (W + wLinea) / 2, y: H - 296 }, thickness: 0.8, color: DORADO })

  centrado(page, 'por haber concluido satisfactoriamente', H - 326, serif, 14, GRIS)

  // Curso
  const curso = limpio(c.course_title)
  const lineas = enLineas(curso, serifB, 22, W - 200)
  const sCurso = lineas.length > 1 ? 19 : 22
  lineas.forEach((l, i) => centrado(page, l, H - 358 - i * (sCurso + 4), serifB, sCurso, TINTA))
  const yGrupo = H - 358 - lineas.length * (sCurso + 4) - 2
  if (c.group_name) centrado(page, limpio(c.group_name), yGrupo, serifI, 12.5, GRIS)

  centrado(page, `Ciudad de México, ${fechaLarga(c.issued_on)}`, 168, serif, 12.5, TINTA)

  // Firma
  const xF = W / 2
  page.drawLine({ start: { x: xF - 110, y: 118 }, end: { x: xF + 110, y: 118 }, thickness: 0.8, color: TINTA })
  centrado(page, limpio(firmaNombre) || 'Dirección Académica', 102, serifB, 12, TINTA)
  centrado(page, limpio(firmaCargo) || 'EAC Academia', 88, serif, 10.5, GRIS)

  // Datos de verificación
  page.drawText(`Matrícula: ${limpio(c.matricula) || '-'}`, { x: 52, y: 54, size: 8.5, font: sans, color: GRIS })
  page.drawText(`Folio: ${c.folio}`, { x: 52, y: 42, size: 8.5, font: sansB, color: TINTA })
  const ver = `Verifica en ${urlVerificacion}`
  page.drawText(ver, { x: W - 52 - sans.widthOfTextAtSize(ver, 8.5), y: 42, size: 8.5, font: sans, color: GRIS })

  return pdf.save()
}
