'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PortalAlumnoPage() {
  const [matriculaIngresada, setMatriculaIngresada] = useState('')
  const [passwordIngresada, setPasswordIngresada] = useState('')
  const [alumno, setAlumno] = useState(null)
  
  const [inscripciones, setInscripciones] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [pagos, setPagos] = useState([])
  const [recursos, setRecursos] = useState([])

  const [loading, setLoading] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  const [modalPassword, setModalPassword] = useState(false)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [guardandoPass, setGuardandoPass] = useState(false)

  const [grupoActivo, setGrupoActivo] = useState(null)
  const [recursoExpandido, setRecursoExpandido] = useState(null)

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

    const { data: alumnos, error } = await supabase.from('alumnos').select('*')

    if (error) {
      setErrorLogin('Error de conexión con la base de datos.')
      setLoading(false)
      return
    }

    const inputLimpio = matriculaIngresada.trim().toLowerCase()

    const encontrado = alumnos.find(a => {
      const mat = String(a.matricula || '').trim().toLowerCase()
      const corr = String(a.correo || a.Correo || '').trim().toLowerCase()
      const tel = String(a.telefono || a.Telefono || '').trim().toLowerCase()

      return (mat && mat === inputLimpio) || 
             (corr && corr === inputLimpio) || 
             (tel && tel === inputLimpio)
    })

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
      setErrorLogin('No se encontró ningún estudiante con esa matrícula, correo o teléfono.')
    }
    setLoading(false)
  }

  const cargarDatosLMS = async (alumnoId) => {
    setLoading(true)

    const { data: resIns } = await supabase.from('inscripciones').select('*').eq('alumno_id', alumnoId)
    const { data: resGrupos } = await supabase.from('grupos').select('*')
    const { data: resCursos } = await supabase.from('cursos').select('*')
    const { data: resPagos } = await supabase.from('pagos').select('*').eq('alumno_id', alumnoId)
    const { data: resRecursos } = await supabase.from('recursos').select('*')

    if (resGrupos) setGrupos(resGrupos)
    if (resCursos) setCursos(resCursos)
    if (resPagos) setPagos(resPagos)
    if (resRecursos) setRecursos(resRecursos)

    if (resIns) {
      const unicas = Array.from(new Map(resIns.map(item => [item.grupo_id, item])).values())
      
      const activas = unicas.filter(i => {
        const est = (i.estatus || 'activa').toLowerCase()
        return est === 'activa' || est === 'confirmada' || est === 'activo'
      })
      setInscripciones(activas)
    }

    setLoading(false)
  }

  const cambiarPasswordAlumno = async (e) => {
    e.preventDefault()
    if (!nuevaPassword.trim()) return
    setGuardandoPass(true)

    const { error } = await supabase
      .from('alumnos')
      .update({ password: nuevaPassword.trim() })
      .eq('id', alumno.id)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      alert('¡Contraseña actualizada con éxito!')
      const alumnoActualizado = { ...alumno, password: nuevaPassword.trim() }
      setAlumno(alumnoActualizado)
      localStorage.setItem('eac_alumno_sesion', JSON.stringify(alumnoActualizado))
      setModalPassword(false)
      setNuevaPassword('')
    }
    setGuardandoPass(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_alumno_sesion')
    setAlumno(null)
    setInscripciones([])
    setPagos([])
    setGrupoActivo(null)
  }

  const obtenerUrlEmbed = (url) => {
    if (!url) return ''
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes('drive.google.com/file/d/')) {
      const fileId = url.split('/file/d/')[1]?.split('/')[0]
      return `https://drive.google.com/file/d/${fileId}/preview`
    }
    return url
  }

  if (!alumno) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] font-sans px-4">
        <div className="bg-white rounded-3xl max-w-lg w-full p-10 shadow-2xl border border-slate-800 space-y-8">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold mx-auto text-xl shadow-lg">EC</div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Portal de Estudiantes</h1>
            <p className="text-sm text-slate-500">Espiritistas a Cantar — Inicia sesión</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Matrícula, Correo o Teléfono</label>
              <input 
                type="text" 
                required 
                value={matriculaIngresada} 
                onChange={(e) => setMatriculaIngresada(e.target.value)} 
                placeholder="Ej. EAC-1024 o correo@ejemplo.com" 
                className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 focus:bg-white transition" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Contraseña LMS</label>
              <input 
                type="password" 
                required 
                value={passwordIngresada} 
                onChange={(e) => setPasswordIngresada(e.target.value)} 
                placeholder="••••••••" 
                className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 focus:bg-white transition font-mono" 
              />
            </div>
            {errorLogin && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-semibold text-center">{errorLogin}</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl text-sm font-bold transition shadow-md">
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
      <header className="bg-white border-b border-slate-200 px-10 py-5 sticky top-0 z-30 shadow-xs flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-md">EC</div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-900">Aula Virtual</h1>
            <p className="text-xs text-slate-500">Bienvenido, <strong className="text-slate-800">{nombreEstudiante}</strong> (#{matriculaEstudiante})</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setModalPassword(true)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-5 py-2.5 rounded-2xl text-xs font-bold transition">
            🔑 Cambiar Contraseña
          </button>
          <button onClick={cerrarSesion} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-2xl text-xs font-bold transition">
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO LMS */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full p-10 space-y-10">
        
        {grupoActivo ? (
          /* VISTA CONTENIDO DEL GRUPO (ACORDEÓN DE CLASES) */
          <div className="space-y-8">
            <button onClick={() => { setGrupoActivo(null); setRecursoExpandido(null); }} className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-2">
              ← Volver a mis cursos
            </button>

            <div className="bg-white p-10 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                {grupoActivo.nombreGrupo}
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{grupoActivo.nombreCurso}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{grupoActivo.descripcion}</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">Módulos y Clases Grabadas</h3>
              
              {grupoActivo.recursosGrupo.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center text-sm text-slate-400">
                  El profesor aún no ha publicado recursos para este grupo.
                </div>
              ) : (
                <div className="space-y-4">
                  {grupoActivo.recursosGrupo.map((rec, i) => {
                    const estaAbierto = recursoExpandido === i
                    const urlEmbed = obtenerUrlEmbed(rec.url)
                    const esVideo = rec.tipo === 'video' || rec.url.includes('youtube') || rec.url.includes('youtu.be') || rec.url.includes('drive.google.com')

                    return (
                      <div key={i} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition">
                        <button 
                          onClick={() => setRecursoExpandido(estaAbierto ? null : i)}
                          className="w-full p-6 flex justify-between items-center bg-white hover:bg-slate-50/80 transition text-left"
                        >
                          <div className="flex items-center gap-4">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${rec.tipo === 'video' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                              {rec.tipo}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">{rec.titulo}</h4>
                          </div>
                          <span className="text-xs text-indigo-600 font-bold bg-indigo-50 px-4 py-2 rounded-xl">
                            {estaAbierto ? '▲ Ocultar clase' : '▼ Ver clase'}
                          </span>
                        </button>

                        {estaAbierto && (
                          <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-6">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-semibold">Reproductor oficial</span>
                              <a href={rec.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 font-bold hover:underline">
                                Abrir enlace original ↗
                              </a>
                            </div>

                            {esVideo ? (
                              <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-slate-900 shadow-lg">
                                <iframe 
                                  src={urlEmbed} 
                                  title={rec.titulo} 
                                  className="w-full h-full border-0" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                  allowFullScreen 
                                />
                              </div>
                            ) : (
                              <div>
                                <a href={rec.url} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl text-sm font-bold transition shadow-md">
                                  Abrir / Descargar Documento PDF →
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VISTA MIS CURSOS */
          <div className="space-y-8">
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Mis Programas e Inscripciones Activas</h3>

            {loading ? (
              <div className="text-center py-16 text-sm text-slate-400">Cargando tus programas...</div>
            ) : inscripciones.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center text-sm text-slate-400">
                No estás inscrito en ningún grupo actualmente.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {inscripciones.map((ins, idx) => {
                  const grupo = grupos.find(g => Number(g.id) === Number(ins.grupo_id))
                  const curso = grupo ? cursos.find(c => Number(c.id) === Number(grupo.curso_id)) : (ins.curso_id ? cursos.find(c => Number(c.id) === Number(ins.curso_id)) : null)
                  if (!grupo || !curso) return null

                  const nombreCurso = curso.Nombre_curso || curso.nombre_curso || 'Curso'
                  const descripcionCurso = curso.descripcion || 'Sin descripción.'
                  const nombreGrupo = grupo.nombre_grupo || 'Grupo'

                  const hoy = new Date().toISOString().split('T')[0]
                  const pagosDelGrupo = pagos.filter(p => Number(p.grupo_id) === Number(grupo.id))
                  
                  const tienePagosVencidos = pagosDelGrupo.some(p => {
                    const est = (p.estatus || 'Pendiente').toLowerCase()
                    if (est === 'pagado') return false
                    return p.fecha_vencimiento && p.fecha_vencimiento <= hoy
                  })

                  const recursosGrupo = recursos.filter(r => Number(r.grupo_id) === Number(grupo.id))

                  return (
                    <div key={idx} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6 flex flex-col justify-between hover:shadow-md transition">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                            {nombreGrupo}
                          </span>
                          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${tienePagosVencidos ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {tienePagosVencidos ? '⚠️ Pago pendiente' : '✅ Al corriente'}
                          </span>
                        </div>

                        <h4 className="text-lg font-extrabold tracking-tight text-slate-900">{nombreCurso}</h4>
                        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{descripcionCurso}</p>
                      </div>

                      <div className="pt-6 border-t border-slate-100">
                        {tienePagosVencidos ? (
                          <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl text-xs font-semibold text-center">
                            🔒 Contenido bloqueado. Regulariza tus cuotas vencidas.
                          </div>
                        ) : (
                          <button 
                            onClick={() => setGrupoActivo({ nombreCurso, nombreGrupo, descripcion: descripcionCurso, recursosGrupo, grupoId: grupo.id })}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl text-xs font-bold transition shadow-sm"
                          >
                            Entrar al Grupo →
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
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Modificar Mi Contraseña</h3>
              <p className="text-xs text-slate-500 mt-1">Ingresa tu nueva clave de acceso personal al LMS.</p>
            </div>
            <form onSubmit={cambiarPasswordAlumno} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Nueva Contraseña</label>
                <input type="text" required value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)} placeholder="Ej. MiClave2026*" className="w-full p-4 border border-indigo-200 rounded-2xl text-sm bg-indigo-50/50 outline-none font-mono font-bold text-indigo-700" />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setModalPassword(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl">Cancelar</button>
                <button type="submit" disabled={guardandoPass} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-sm">
                  {guardandoPass ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
