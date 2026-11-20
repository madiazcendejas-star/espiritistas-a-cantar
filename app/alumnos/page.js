'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PortalAlumnoPage() {
  const [matriculaIngresada, setMatriculaIngresada] = useState('')
  const [passwordIngresada, setPasswordIngresada] = useState('')
  const [alumno, setAlumno] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [pagos, setPagos] = useState([])
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  // Modal para cambiar contraseña
  const [modalPassword, setModalPassword] = useState(false)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [passwordActual, setPasswordActual] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)

  // Curso seleccionado para ver sus contenidos
  const [cursoActivo, setCursoActivo] = useState(null)

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

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: matriculaIngresada.trim(), password: passwordIngresada.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.alumno) {
        setAlumno(json.alumno)
        localStorage.setItem('eac_alumno_sesion', JSON.stringify(json.alumno))
        cargarDatosLMS(json.alumno.id)
      } else {
        setErrorLogin(json.error || 'Datos de acceso incorrectos.')
      }
    } catch (err) {
      setErrorLogin('Error de conexión con el servidor.')
    }
    setLoading(false)
  }

  const cargarDatosLMS = async (alumnoId) => {
    setLoading(true)

    // 1. Cargar inscripciones activas del alumno
    const { data: resIns } = await supabase
      .from('inscripciones')
      .select(`
        id,
        estatus,
        grupo_id,
        grupos (
          id,
          nombre_grupo,
          costo_total,
          cursos (
            id,
            Nombre_curso,
            nombre_curso,
            descripcion
          )
        )
      `)
      .eq('alumno_id', alumnoId)
      .eq('estatus', 'activa')

    if (resIns) setInscripciones(resIns)

    // 2. Cargar pagos del alumno
    const { data: resPagos } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumnoId)

    if (resPagos) setPagos(resPagos)

    // 3. Cargar todos los recursos multimedia disponibles
    const { data: resRecursos } = await supabase
      .from('recursos')
      .select('*')

    if (resRecursos) setRecursos(resRecursos)

    setLoading(false)
  }

  const cambiarPasswordAlumno = async (e) => {
    e.preventDefault()
    if (!nuevaPassword.trim() || !passwordActual.trim()) return
    setGuardandoPass(true)

    const res = await fetch('/api/cambiar-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId: alumno.id, actual: passwordActual, nueva: nuevaPassword }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(json.error || 'Error al actualizar contraseña.')
    } else {
      alert('¡Contraseña actualizada exitosamente!')
      setModalPassword(false)
      setNuevaPassword('')
      setPasswordActual('')
    }
    setGuardandoPass(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_alumno_sesion')
    setAlumno(null)
    setInscripciones([])
    setPagos([])
    setCursoActivo(null)
  }

  // VISTA 1: LOGIN
  if (!alumno) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] font-sans px-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-800 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold mx-auto text-base shadow-md">EC</div>
            <h1 className="text-lg font-extrabold text-slate-900">Portal de Estudiantes</h1>
            <p className="text-xs text-slate-500">Espiritistas a Cantar — Inicia sesión</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Matrícula o Correo</label>
              <input 
                type="text" 
                required
                value={matriculaIngresada}
                onChange={(e) => setMatriculaIngresada(e.target.value)}
                placeholder="Ej. EAC-1024"
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
            {errorLogin && <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold text-center">{errorLogin}</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs font-bold transition shadow-sm">
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const nombreEstudiante = alumno.nombre || alumno.Nombre || alumno.nombre_completo || 'Estudiante'
  const matriculaEstudiante = alumno.matricula || `EAC-${alumno.id}`

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30 shadow-xs flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-extrabold text-xs">EC</div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Aula Virtual</h1>
            <p className="text-[11px] text-slate-400">Bienvenido, <strong className="text-slate-800">{nombreEstudiante}</strong> (#{matriculaEstudiante})</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setModalPassword(true)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold transition">
            🔑 Cambiar Contraseña
          </button>
          <button onClick={cerrarSesion} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO LMS */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-8 space-y-8">
        
        {cursoActivo ? (
          /* VISTA DETALLE DEL CURSO Y SUS RECURSOS */
          <div className="space-y-6">
            <button onClick={() => setCursoActivo(null)} className="text-xs font-bold text-indigo-600 hover:underline">
              ← Volver a mis cursos
            </button>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full uppercase">
                {cursoActivo.grupoNombre}
              </span>
              <h2 className="text-xl font-extrabold text-slate-900">{cursoActivo.nombreCurso}</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{cursoActivo.descripcion}</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Materiales y Clases Grabadas</h3>
              
              {cursoActivo.recursosCurso.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                  El profesor aún no ha publicado recursos multimedia para este curso.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cursoActivo.recursosCurso.map((rec, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-bold">{rec.tipo}</span>
                        <h4 className="text-xs font-bold text-slate-900">{rec.titulo}</h4>
                      </div>
                      <a 
                        href={rec.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition"
                      >
                        Abrir material →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VISTA LISTADO DE MIS CURSOS INSCRITOS */
          <div className="space-y-6">
            <h3 className="text-base font-bold text-slate-900">Mis Cursos Inscritos</h3>

            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400">Cargando tus programas...</div>
            ) : inscripciones.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No estás inscrito en ningún grupo actualmente.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inscripciones.map((ins, idx) => {
                  const grupo = ins.grupos
                  const curso = grupo?.cursos
                  if (!curso) return null

                  const nombreCurso = curso.Nombre_curso || curso.nombre_curso || 'Curso'
                  const descripcionCurso = curso.descripcion || 'Sin descripción.'
                  const nombreGrupo = grupo.nombre_grupo || 'Grupo'

                  // Validar pagos pendientes para este grupo
                  const pagosDelGrupo = pagos.filter(p => Number(p.grupo_id) === Number(grupo.id))
                  const tienePagosPendientes = pagosDelGrupo.some(p => p.estatus !== 'Pagado')

                  const recursosCurso = recursos.filter(r => Number(r.curso_id) === Number(curso.id))

                  return (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase">
                            {nombreGrupo}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${tienePagosPendientes ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {tienePagosPendientes ? '⚠️ Pago pendiente' : '✅ Al corriente'}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-slate-900">{nombreCurso}</h4>
                        <p className="text-xs text-slate-500 line-clamp-3">{descripcionCurso}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100">
                        {tienePagosPendientes ? (
                          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-medium text-center">
                            🔒 Contenido bloqueado. Regulariza tus cuotas pendientes en administración.
                          </div>
                        ) : (
                          <button 
                            onClick={() => setCursoActivo({ nombreCurso, grupoNombre: nombreGrupo, descripcion: descripcionCurso, recursosCurso, cursoId: curso.id })}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
                          >
                            Entrar al Curso →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {modalPassword && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Modificar Mi Contraseña</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ingresa tu nueva clave de acceso personal al LMS.</p>
            </div>
            <form onSubmit={cambiarPasswordAlumno} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña actual</label>
                <input 
                  type="password" 
                  required
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  autoComplete="current-password"
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-xs outline-none font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nueva Contraseña</label>
                <input 
                  type="text" 
                  required
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  placeholder="Ej. MiClave2026*"
                  className="w-full p-3.5 border border-indigo-200 rounded-xl text-xs bg-indigo-50/50 outline-none font-mono font-bold text-indigo-700"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setModalPassword(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardandoPass} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">
                  {guardandoPass ? 'Guardando...' : 'Guardar Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
