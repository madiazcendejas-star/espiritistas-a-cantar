'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PortalAlumnoPage() {
  const [matriculaIngresada, setMatriculaIngresada] = useState('')
  const [passwordIngresada, setPasswordIngresada] = useState('')
  const [alumno, setAlumno] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  // Intentar recuperar sesión guardada en localStorage al cargar
  useEffect(() => {
    const alumnoGuardado = localStorage.getItem('eac_alumno_sesion')
    if (alumnoGuardado) {
      const datos = JSON.parse(alumnoGuardado)
      setAlumno(datos)
      cargarDatosLMS(datos.id)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorLogin('')

    const { data: alumnos, error } = await supabase
      .from('alumnos')
      .select('*')

    if (error) {
      setErrorLogin('Error de conexión con la base de datos.')
      setLoading(false)
      return
    }

    const encontrado = alumnos.find(a => 
      String(a.matricula).trim().toLowerCase() === matriculaIngresada.trim().toLowerCase() ||
      String(a.correo).trim().toLowerCase() === matriculaIngresada.trim().toLowerCase()
    )

    if (encontrado) {
      const passwordRegistrada = encontrado.password || 'EAC2026*'
      if (passwordIngresada.trim() === passwordRegistrada) {
        setAlumno(encontrado)
        localStorage.setItem('eac_alumno_sesion', JSON.stringify(encontrado))
        cargarDatosLMS(encontrado.id)
      } else {
        setErrorLogin('Contraseña incorrecta. Verifica tus datos.')
      }
    } else {
      setErrorLogin('No se encontró ningún estudiante con esa matrícula o correo.')
    }
    setLoading(false)
  }

  const cargarDatosLMS = async (alumnoId) => {
    setLoading(true)

    // 1. Cargar inscripciones y sus relaciones
    const { data: resIns } = await supabase
      .from('inscripciones')
      .select(`
        id,
        estatus,
        grupos (
          id,
          nombre_grupo,
          costo_total,
          fecha_inicio,
          cursos (
            id,
            Nombre_curso,
            nombre_curso,
            descripcion
          )
        )
      `)
      .eq('alumno_id', alumnoId)

    if (resIns) setInscripciones(resIns)

    // 2. Cargar pagos del alumno
    const { data: resPagos } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumnoId)

    if (resPagos) setPagos(resPagos)

    setLoading(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_alumno_sesion')
    setAlumno(null)
    setInscripciones([])
    setPagos([])
    setMatriculaIngresada('')
    setPasswordIngresada('')
  }

  // VISTA 1: LOGIN DEL ESTUDIANTE
  if (!alumno) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] font-sans px-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-800 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold mx-auto text-base shadow-md">EC</div>
            <h1 className="text-lg font-extrabold text-slate-900">Portal de Estudiantes</h1>
            <p className="text-xs text-slate-500">Espiritistas a Cantar — Ingresa a tu academia</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Matrícula o Correo Electrónico</label>
              <input 
                type="text" 
                required
                value={matriculaIngresada}
                onChange={(e) => setMatriculaIngresada(e.target.value)}
                placeholder="Ej. EAC-1024 o correo@ejemplo.com"
                className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña LMS</label>
              <input 
                type="password" 
                required
                value={passwordIngresada}
                onChange={(e) => setPasswordIngresada(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600 font-mono"
              />
            </div>

            {errorLogin && (
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold text-center">
                {errorLogin}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              {loading ? 'Verificando acceso...' : 'Iniciar Sesión en el Portal'}
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-[11px] text-slate-400">¿Problemas con tu acceso? Contacta a administración.</span>
          </div>
        </div>
      </div>
    )
  }

  // VISTA 2: DASHBOARD / AULA VIRTUAL DEL ESTUDIANTE
  const nombreEstudiante = alumno.nombre || alumno.Nombre || alumno.nombre_completo || 'Estudiante'
  const matriculaEstudiante = alumno.matricula || `EAC-${alumno.id}`

  const pagosPendientes = pagos.filter(p => p.estatus !== 'Pagado')

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans text-slate-900">
      
      {/* HEADER DEL ALUMNO */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30 shadow-xs flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-extrabold text-xs">EC</div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Aula Virtual — Espiritistas a Cantar</h1>
            <p className="text-[11px] text-slate-400">Bienvenido(a), <span className="font-semibold text-slate-700">{nombreEstudiante}</span> (#{matriculaEstudiante})</p>
          </div>
        </div>

        <button 
          onClick={cerrarSesion}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
        >
          Cerrar Sesión
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL DEL LMS */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-8 space-y-8">
        
        {/* AVISO DE PAGOS SI EXISTEN */}
        {pagosPendientes.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="text-xs font-bold text-amber-900">Tienes cuotas pendientes de pago</h4>
                <p className="text-[11px] text-amber-700">Regulariza tus pagos para evitar restricciones de acceso en tus clases en vivo o materiales.</p>
              </div>
            </div>
            <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-xl">
              {pagosPendientes.length} pendiente(s)
            </span>
          </div>
        )}

        {/* CURSOS Y GRUPOS INSCRITOS */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Mis Cursos y Programas Activos</h3>
          
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Cargando tus programas académicos...</div>
          ) : inscripciones.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
              No estás inscrito en ningún grupo actualmente. Solicita tu inscripción en administración.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inscripciones.map((ins, idx) => {
                const grupo = ins.grupos
                const curso = grupo?.cursos
                const nombreCurso = curso?.Nombre_curso || curso?.nombre_curso || 'Programa Académico'
                const descripcionCurso = curso?.descripcion || 'Contenido exclusivo para alumnos matriculados.'
                const nombreGrupo = grupo?.nombre_grupo || 'Grupo general'

                return (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase">
                          {nombreGrupo}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded-full">
                          Matrícula Activa
                        </span>
                      </div>

                      <h4 className="text-base font-extrabold text-slate-900">{nombreCurso}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{descripcionCurso}</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 space-y-3">
                      <button 
                        onClick={() => alert(`Accediendo a las lecciones de: ${nombreCurso} (${nombreGrupo})`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
                      >
                        📺 Acceder a Clases y Materiales
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* HISTORIAL FINANCIERO DEL ALUMNO */}
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Mi Historial de Cuotas y Pagos</h3>
          </div>
          <div className="overflow-x-auto">
            {pagos.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No hay registros de pagos asociados a tu cuenta.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-6">Concepto / Cuota</th>
                    <th className="py-3 px-6">Vencimiento</th>
                    <th className="py-3 px-6">Monto</th>
                    <th className="py-3 px-6 text-right">Estatus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {pagos.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-4 px-6 font-medium text-slate-900">Cuota #${i + 1} (Ref: #{p.id})</td>
                      <td className="py-4 px-6 text-slate-500">{p.fecha_vencimiento}</td>
                      <td className="py-4 px-6 font-extrabold text-slate-900">$ {Number(p.monto).toLocaleString('es-MX')} MXN</td>
                      <td className="py-4 px-6 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${p.estatus === 'Pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {p.estatus || 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
