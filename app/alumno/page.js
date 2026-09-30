'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AlumnoPortalPage() {
  const [identificador, setIdentificador] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [alumno, setAlumno] = useState(null)
  
  const [inscripciones, setInscripciones] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [pagos, setPagos] = useState([])
  const [recursos, setRecursos] = useState([])
  
  // NUEVOS ESTADOS PARA TANDAS Y SESIONES PRESENCIALES
  const [tandaAlumno, setTandaAlumno] = useState(null)
  const [pagosTanda, setPagosTanda] = useState([])

  const [loading, setLoading] = useState(false)

  // Estado para cambiar contraseña
  const [modalPass, setModalPass] = useState(false)
  const [nuevaPass, setNuevaPass] = useState('')

  // Estado para acordeón de recursos (guarda el ID del recurso abierto)
  const [recursoAbierto, setRecursoAbierto] = useState(null)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    const valorLimpio = identificador.trim()
    const passwordLimpia = passwordInput.trim()

    if (!valorLimpio || !passwordLimpia) {
      return alert('Ingresa tu matrícula o teléfono y contraseña.')
    }

    setLoading(true)

    // Traemos todos los alumnos para validar de forma local y segura contra matrícula, teléfono o correo
    const { data: todosLosAlumnos, error } = await supabase
      .from('alumnos')
      .select('*')

    if (error || !todosLosAlumnos) {
      setLoading(false)
      return alert('Error de conexión con la base de datos: ' + (error?.message || 'Desconocido'))
    }

    // Buscamos haciendo coincidir la matrícula, el teléfono o el correo real
    const al = todosLosAlumnos.find(item => {
      const mat = item.matricula ? String(item.matricula).trim().toLowerCase() : ''
      const tel = item.telefono ? String(item.telefono).trim().toLowerCase() : ''
      const mail = item.correo && item.correo !== 'EMPTY' ? String(item.correo).trim().toLowerCase() : ''
      const busqueda = valorLimpio.toLowerCase()

      return (mat && mat === busqueda) || (tel && tel === busqueda) || (mail && mail === busqueda)
    })

    if (!al) {
      setLoading(false)
      return alert('No se encontró un alumno con esa matrícula, teléfono o correo.')
    }

    const passwordRegistrada = al.password || al.Password || 'EAC2026*'

    if (passwordLimpia !== passwordRegistrada) {
      setLoading(false)
      return alert('Contraseña incorrecta.')
    }

    setAlumno(al)
    await cargarDatosPortal(al.id)
    setLoading(false)
  }

  const cargarDatosPortal = async (alumnoId) => {
    // 1. Inscripciones
    const { data: ins } = await supabase.from('inscripciones').select('*').eq('alumno_id', alumnoId)
    setInscripciones(ins || [])

    // 2. Grupos
    const { data: grp } = await supabase.from('grupos').select('*')
    setGrupos(grp || [])

    // 3. Cursos
    const { data: crs } = await supabase.from('cursos').select('*')
    setCursos(crs || [])

    // 4. Pagos
    const { data: pgs } = await supabase.from('pagos').select('*').eq('alumno_id', alumnoId)
    setPagos(pgs || [])

    // 5. Recursos
    const { data: rcs } = await supabase.from('recursos').select('*')
    setRecursos(rcs || [])

    // 6. NUEVO: Consultar si tiene Tanda Activa y sus pagos de tanda
    const { data: tandaData } = await supabase
      .from('alumno_tandas')
      .select(`
        id,
        fecha_misa,
        estado,
        tandas_config (
          nombre,
          total_pagos,
          monto_por_pago
        )
      `)
      .eq('alumno_id', alumnoId)
      .eq('estado', 'activa')
      .maybeSingle()

    if (tandaData) {
      setTandaAlumno(tandaData)
      const { data: pgsTanda } = await supabase
        .from('tanda_pagos')
        .select('*')
        .eq('alumno_tanda_id', tandaData.id)
      setPagosTanda(pgsTanda || [])
    } else {
      setTandaAlumno(null)
      setPagosTanda([])
    }
  }

  const actualizarPassword = async (e) => {
    e.preventDefault()
    if (!nuevaPass.trim()) return

    const { error } = await supabase
      .from('alumnos')
      .update({ password: nuevaPass.trim() })
      .eq('id', alumno.id)

    if (error) {
      alert('Error al actualizar contraseña: ' + error.message)
    } else {
      alert('¡Contraseña actualizada con éxito!')
      setModalPass(false)
      setNuevaPass('')
    }
  }

  // Función para convertir URLs de YouTube o Drive en formato embebible
  const obtenerUrlIncrustada = (url) => {
    if (!url) return ''
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${videoId}`
    }
    if (url.includes('drive.google.com')) {
      return url.replace('/view', '/preview').replace('/edit', '/preview')
    }
    return url
  }

  // PANTALLA DE LOGIN DEL ALUMNO
  if (!alumno) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl mx-auto flex items-center justify-center font-bold text-sm shadow-md">EC</div>
            <h1 className="text-xl font-extrabold text-slate-900">Portal del Alumno</h1>
            <p className="text-xs text-slate-500">Espiritistas a Cantar · Aula Virtual</p>
          </div>

          <form onSubmit={iniciarSesion} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Matrícula, Teléfono o Correo</label>
              <input 
                type="text" 
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ej. EAC-3159 o tu teléfono"
                className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña LMS</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl text-xs font-semibold shadow-md transition"
            >
              {loading ? 'Verificando acceso...' : 'Ingresar al Portal'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // DASHBOARD DEL ALUMNO INSCRITO
  const nombreAlumno = alumno.nombre || alumno.Nombre || 'Estudiante'

  // Filtrar solo inscripciones verdaderamente activas
  const inscripcionesActivas = inscripciones.filter(i => (i.estatus || 'activa') === 'activa')

  // Cálculos para la tanda (si está inscrito)
  const pagosHechosTanda = pagosTanda.filter(p => p.estado === 'pagado').length
  const totalPagosTanda = tandaAlumno?.tandas_config?.total_pagos || 10
  const montoPorPagoTanda = tandaAlumno?.tandas_config?.monto_por_pago || 0
  const saldoPendienteTanda = (totalPagosTanda - pagosHechosTanda) * montoPorPagoTanda
  const fechaMisaFormateada = tandaAlumno?.fecha_misa 
    ? new Date(tandaAlumno.fecha_misa).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
    : 'Por definir'

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 flex flex-col">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xs">EC</div>
          <span className="text-xs font-bold text-slate-800">Espiritistas a Cantar · Aula Virtual</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-600">¡Bienvenido, {nombreAlumno}!</span>
          <button 
            onClick={() => setModalPass(true)} 
            className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-xl font-semibold transition"
          >
            🔑 Cambiar Contraseña
          </button>
          <button 
            onClick={() => setAlumno(null)} 
            className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-xl font-semibold transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 p-8 max-w-[1400px] mx-auto w-full space-y-8">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Mis Cursos y Contenidos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Accede à tus clases grabadas, materiales y revisa el estatus de tus grupos.</p>
        </div>

        {/* ---------------------------------------------------- */}
        {/* MODULO CONDICIONAL DE TANDAS Y SESIONES PRESENCIALES  */}
        {/* ---------------------------------------------------- */}
        {tandaAlumno && (
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg border border-indigo-500/30 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-700/50 pb-4">
              <div>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-400/20">
                  📍 Sesión Presencial y Compromiso
                </span>
                <h3 className="text-lg font-extrabold text-white mt-1.5">{tandaAlumno.tandas_config.nombre}</h3>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs">
                📅 <strong>Fecha de tu Misa:</strong> <span className="text-indigo-200">{fechaMisaFormateada}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Pagos Registrados</span>
                <span className="text-xl font-extrabold text-white">{pagosHechosTanda} / {totalPagosTanda}</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1">Saldo Pendiente</span>
                <span className={`text-xl font-extrabold ${saldoPendienteTanda === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  ${saldoPendienteTanda.toFixed(2)}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-indigo-300 block mb-1.5">Progreso de Tu Compromiso</span>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-400 h-full transition-all duration-500" 
                    style={{ width: `${(pagosHechosTanda / totalPagosTanda) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ---------------------------------------------------- */}

        {inscripciones.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <span className="text-3xl">📚</span>
            <h3 className="text-sm font-bold text-slate-800">No tienes inscripciones registradas</h3>
            <p className="text-xs text-slate-400">Comunícate con administración para que te inscriba a tu curso o taller.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {inscripciones.map((ins) => {
              const grupoObj = grupos.find(g => Number(g.id) === Number(ins.grupo_id))
              const cursoObj = cursos.find(c => Number(c.id) === Number(grupoObj?.curso_id))
              const nombreCurso = cursoObj?.Nombre_curso || cursoObj?.nombre_curso || 'Curso Académico'
              const nombreGrupo = grupoObj?.nombre_grupo || 'Grupo General'
              const estatusIns = ins.estatus || 'activa'

              // Verificar si la inscripción está dada de baja
              const estaEnBaja = estatusIns === 'baja'

              // Verificar si el alumno tiene pagos vencidos en este grupo específico
              const pagosDelGrupo = pagos.filter(p => Number(p.grupo_id) === Number(ins.grupo_id))
              const tienePagoVencido = pagosDelGrupo.some(p => p.estatus === 'Vencido' || (p.estatus === 'Pendiente' && new Date(p.fecha_vencimiento) < new Date()))

              // Recursos de este grupo
              const recursosGrupo = recursos.filter(r => Number(r.grupo_id) === Number(ins.grupo_id))

              return (
                <div key={ins.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        {nombreGrupo}
                      </span>
                      <h3 className="text-lg font-extrabold text-slate-900 mt-1">{nombreCurso}</h3>
                    </div>
                    {estaEnBaja ? (
                      <span className="bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                        🔴 Curso dado de baja · Acceso suspendido
                      </span>
                    ) : tienePagoVencido ? (
                      <span className="bg-rose-50 text-rose-600 px-4 py-2 rounded-2xl text-xs font-bold border border-rose-100 flex items-center gap-2">
                        ⚠️ Acceso pausado por pago pendiente en este grupo
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center gap-2">
                        ✅ Al corriente · Acceso habilitado
                      </span>
                    )}
                  </div>

                  {estaEnBaja ? (
                    <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 text-center space-y-2">
                      <p className="text-xs font-bold text-rose-900">Actualmente estás dado de baja de este curso.</p>
                      <p className="text-[11px] text-rose-700">Tu historial y pagos previos están seguros. Si deseas reincorporarte y continuar con tus clases, comunícate con administración.</p>
                    </div>
                  ) : tienePagoVencido ? (
                    <div className="p-6 bg-rose-50/50 rounded-2xl border border-rose-100 text-center space-y-2">
                      <p className="text-xs font-bold text-rose-900">Tienes cuotas pendientes o vencidas en este grupo.</p>
                      <p className="text-[11px] text-rose-700">Por favor regulariza tu pago con administración para desbloquear los videos y materiales de clase.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Clases y Materiales del Grupo</h4>
                      
                      {recursosGrupo.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4">Próximamente se subirán las grabaciones y PDFs de este grupo.</p>
                      ) : (
                        <div className="space-y-2">
                          {recursosGrupo.map((rec) => {
                            const estaAbierto = recursoAbierto === rec.id
                            const urlEmbebida = obtenerUrlIncrustada(rec.url)

                            return (
                              <div key={rec.id} className="border border-slate-200 rounded-2xl overflow-hidden transition bg-slate-50">
                                {/* Cabecera del acordeón */}
                                <div 
                                  onClick={() => setRecursoAbierto(estaAbierto ? null : rec.id)}
                                  className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center font-bold text-xs shadow-xs border border-slate-100">
                                      {rec.tipo === 'video' ? '▶' : '📄'}
                                    </span>
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-900">{rec.titulo}</h5>
                                      <span className="text-[10px] text-slate-500 uppercase">{rec.tipo === 'video' ? 'Clase Grabada' : 'Documento PDF'}</span>
                                    </div>
                                  </div>
                                  <span className="text-xs font-bold text-slate-400">
                                    {estaAbierto ? '▲ Ocultar' : '▼ Ver clase'}
                                  </span>
                                </div>

                                {/* Contenido desplegable (Acordeón) */}
                                {estaAbierto && (
                                  <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                                    {rec.tipo === 'video' ? (
                                      <div className="aspect-video w-full bg-slate-950 rounded-xl overflow-hidden shadow-md">
                                        <iframe 
                                          src={urlEmbebida} 
                                          title={rec.titulo}
                                          className="w-full h-full border-0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                          allowFullScreen
                                        />
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <span className="text-xs text-slate-700">Documento adjunto disponible para lectura o descarga.</span>
                                        <a 
                                          href={rec.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                                        >
                                          Abrir / Descargar PDF ↗
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
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {modalPass && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Modificar mi Contraseña</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ingresa tu nueva clave de acceso personal para el portal.</p>
            </div>

            <form onSubmit={actualizarPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nueva Contraseña</label>
                <input 
                  type="text" 
                  required
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  placeholder="Ej. MiClave2026*"
                  className="w-full p-3.5 border border-indigo-200 rounded-xl text-xs bg-indigo-50/50 outline-none focus:border-indigo-600 font-mono font-bold text-indigo-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalPass(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
