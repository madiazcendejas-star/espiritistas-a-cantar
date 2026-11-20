import { NextResponse } from 'next/server'
import { buscarAlumno, passwordRegistrada, sanitizar, esperar } from '../../../lib/alumnoAuth'

export const dynamic = 'force-dynamic'

// Login de estudiantes en el servidor: el navegador ya no descarga la tabla de alumnos.
export async function POST(req) {
  try {
    const { identificador, password } = await req.json()
    if (!identificador || !password) {
      return NextResponse.json({ error: 'Ingresa tu teléfono, matrícula o correo y tu contraseña.' }, { status: 400 })
    }
    const alumno = await buscarAlumno(identificador)
    if (!alumno || String(password).trim() !== passwordRegistrada(alumno)) {
      await esperar(600)
      return NextResponse.json({ error: 'Datos de acceso incorrectos.' }, { status: 401 })
    }
    return NextResponse.json({ alumno: sanitizar(alumno) })
  } catch (e) {
    console.error('Error en /api/login', e)
    return NextResponse.json({ error: 'Error de conexión. Intenta de nuevo.' }, { status: 500 })
  }
}
