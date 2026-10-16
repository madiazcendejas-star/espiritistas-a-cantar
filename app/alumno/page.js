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
  
  // TANDAS Y SESIONES PRESENCIALES
  const [tandaAlumno, setTandaAlumno] = useState(null)
  const [pagosTanda, setPagosTanda] = useState([])

  const [loading, setLoading] = useState(false)

  // NAVEGACIÓN Y MENÚS DEL ALUMNO ('cursos', 'pagos', 'tandas', 'perfil')
  const [menuActivo, setMenuActivo] = useState('cursos')

  // CURSO SELECCIONADO PARA VER SU CONTENIDO
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)

  // Estado para cambiar contraseña
  const [modalPass, setModalPass] = useState(false)
  const [nuevaPass, setNuevaPass] = useState('')

  // Estado para acordeón de recursos
  const [recursoAbierto, setRecursoAbierto] = useState(null)

  // ESTADOS PARA SUBIR COMPROBANTE
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [archivoComprobante, setArchivoComprobante] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  const iniciarSesion = async (e) => {
    e.preventDefault()
    const valorLimpio = identificador.trim()
    const passwordLimpia = passwordInput.trim()

    if (!valorLimpio || !passwordLimpia) {
      return alert('Ingresa tu matrícula o teléfono y contraseña.')
    }

    setLoading(true)

    const { data: todosLosAlumnos, error } = await supabase
      .from('alumnos')
      .select('*')

    if (error || !todosLosAlumnos) {
      setLoading(false)
      return alert('Error de conexión con la base de datos: ' + (error?.message || 'Desconocido'))
    }

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
    const { data: ins } = await supabase.from('inscripciones').select('*').eq('alumno_id', alumnoId)
    setInscripciones(ins || [])

    const { data: grp } = await supabase.from('grupos').select('*')
    setGrupos(grp || [])

    const { data: crs } = await supabase.from('cursos').select('*')
    setCursos(crs || [])

    const { data: pgs } = await supabase.from('pagos').select('*').eq('alumno_id', alumnoId)
    setPagos(pgs || [])

    const { data: rcs } = await supabase.from('recursos').select('*')
    setRecursos(rcs || [])

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

  // SUBIR COMPROBANTE DE PAGO CORREGIDO Y REFORZADO
  const enviarComprobante = async (e) => {
    e.preventDefault()
    if (!archivoComprobante || !pagoSeleccionado) {
      alert('Por favor selecciona un archivo de comprobante.')
      return
    }

    setSubiendo(true)

    try {
      const fileExt = archivoComprobante.name.split('.').pop()
      const fileName = `comprobante_${pagoSeleccionado}_${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, archivoComprobante)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      if (!publicUrl) {
        throw new Error('No se pudo generar la URL pública de la imagen.')
      }

      // Guardar la liga en la base de datos asegurando ambas variantes de nombre de columna
      const { error: updateError } = await supabase
        .from('pagos')
        .update({
          comprobante_url: publicUrl,
          url_comprobante: publicUrl,
          estatus: 'Revision'
        })
        .eq('id', pagoSeleccionado)

      if (updateError) throw updateError

      alert('¡Comprobante enviado con éxito! Administración lo validará pronto.')
      setPagoSeleccionado(null)
      setArchivoComprobante(null)
      await cargarDatosPortal(alumno.id)

    } catch (error) {
      alert('Error al subir el comprobante: ' + error.message)
    } finally {
      setSubiendo(false)
    }
  }

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

  // PANTALLA DE LOGIN
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
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Matrícula, Teléfono o Correo</label>
              <input 
                type="text" 
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ej. EAC-3159 o tu teléfono"
                className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Contraseña LMS</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl text-sm font-bold shadow-md transition"
            >
              {loading ? 'Verificando acceso...' : 'Ingresar al Portal'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const nombreAlumno = alumno.nombre || alumno.Nombre || 'Estudiante'
  const matriculaAlumno = alumno.matricula || 'N/A'
  const correoAlumno = alumno.correo || 'No registrado'
  const telefonoAlumno = alumno.telefono || 'No registrado'

  const pagosHechosTanda = pagosTanda.filter(p => p.estado === 'pagado').length
  const totalPagosTanda = tandaAlumno?.tandas_config?.total_pagos || 10
  const montoPorPagoTanda = tandaAlumno?.tandas_config?.monto_por_pago || 0
  const saldoPendienteTanda = (totalPagosTanda - pagosHechosTanda) * montoPorPagoTanda
  const fechaMisaFormateada = tandaAlumno?.fecha_misa 
    ? new Date(tandaAlumno.fecha_misa).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
    : 'Por definir'

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 text-sm flex">
      
      {/* BARRA LATERAL TIPO UNIVERSIDAD */}
      <aside className="w-72 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-[#0f172a]">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-sm leading-tight">Espiritistas a Cantar</span>
            <span className="text-xs text-indigo-400 font-medium">Aula Virtual</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 text-sm font-medium">
          <div className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Navegación</div>
          <button 
            onClick={() => { setMenuActivo('cursos'); setCursoSeleccionado(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition ${menuActivo === 'cursos' && !cursoSeleccionado ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            📚 Mis Cursos
          </button>
          <button 
            onClick={() => setMenuActivo('pagos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition ${menuActivo === 'pagos' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            💳 Pagos y Comprobantes
          </button>
          {tandaAlumno && (
            <button 
              onClick={() => setMenuActivo('tandas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition ${menuActivo === 'tandas' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              📍 Sesiones y Tandas
            </button>
          )}
          <button 
            onClick={() => setMenuActivo('perfil')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition ${menuActivo === 'perfil' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            👤 Mi Perfil
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-[#0f172a]/50">
          <button 
            onClick={() => setAlumno(null)} 
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-3 rounded-2xl text-xs font-bold transition text-center"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* HEADER SUPERIOR */}
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-extrabold text-slate-900">
              {cursoSeleccionado ? cursoSeleccionado.nombreCurso : 
               menuActivo === 'cursos' ? 'Mis Cursos Activos' :
               menuActivo === 'pagos' ? 'Estado de Cuenta y Pagos' :
               menuActivo === 'tandas' ? 'Compromiso Presencial (Tanda)' : 'Mi Perfil Estudiantil'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800">{nombreAlumno}</span>
              <span className="text-[11px] text-slate-400 font-mono">Matrícula: #{matriculaAlumno}</span>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm border border-indigo-100">
              {nombreAlumno.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-8 flex-1">
          
          {/* ==================================================== */}
          {/* VISTA 1: DETALLE DEL CURSO SELECCIONADO (CON BLOQUEO ESTRICTO) */}
          {/* ==================================================== */}
          {cursoSeleccionado ? (
            <div className="space-y-6">
              <button 
                onClick={() => setCursoSeleccionado(null)}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1.5 bg-indigo-50 px-4 py-2 rounded-xl w-fit"
              >
                ← Volver a mis cursos
              </button>

              {/* VALIDACIÓN ESTRICTA DE BLOQUEO POR PAGO PENDIENTE O BAJA */}
              {cursoSeleccionado.estaEnBaja ? (
                <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">🔴</div>
                  <h3 className="text-lg font-extrabold text-slate-900">Acceso Suspendido</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Actualmente te encuentras dado de baja de este curso. Si deseas reincorporarte, comunícate con administración.
                  </p>
                </div>
              ) : cursoSeleccionado.tienePagoVencido ? (
                <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">⚠️</div>
                  <h3 className="text-lg font-extrabold text-slate-900">Acceso Pausado por Cuota Pendiente</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Tienes pagos pendientes o vencidos correspondientes a este grupo. Para desbloquear las clases y materiales, por favor regulariza tu pago y sube tu comprobante en la sección de Pagos.
                  </p>
                  <button 
                    onClick={() => setMenuActivo('pagos')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition shadow-sm inline-block"
                  >
                    Ir a Pagos y Subir Comprobante →
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                        {cursoSeleccionado.nombreGrupo}
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-2">{cursoSeleccionado.nombreCurso}</h2>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-100">
                      ✅ Acceso Habilitado
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Clases y Materiales Grabados</h4>
                    
                    {cursoSeleccionado.recursos.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        Próximamente se subirán las grabaciones y PDFs para este grupo.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {cursoSeleccionado.recursos.map((rec) => {
                          const estaAbierto = recursoAbierto === rec.id
                          const urlEmbebida = obtenerUrlIncrustada(rec.url)

                          return (
                            <div key={rec.id} className="border border-slate-200 rounded-2xl overflow-hidden transition bg-slate-50">
                              <div 
                                onClick={() => setRecursoAbierto(estaAbierto ? null : rec.id)}
                                className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition"
                              >
                                <div className="flex items-center gap-4">
                                  <span className="w-10 h-10 rounded-2xl bg-white text-indigo-600 flex items-center justify-center font-bold text-sm shadow-xs border border-slate-100">
                                    {rec.tipo === 'video' ? '▶' : '📄'}
                                  </span>
                                  <div>
                                    <h5 className="text-sm font-bold text-slate-900">{rec.titulo}</h5>
                                    <span className="text-xs text-slate-500 uppercase">{rec.tipo === 'video' ? 'Clase Grabada' : 'Documento PDF'}</span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold text-indigo-600">
                                  {estaAbierto ? '▲ Ocultar' : '▼ Ver clase'}
                                </span>
                              </div>

                              {estaAbierto && (
                                <div className="p-5 bg-white border-t border-slate-200 space-y-4">
                                  {rec.tipo === 'video' ? (
                                    <div className="aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden shadow-md">
                                      <iframe 
                                        src={urlEmbebida} 
                                        title={rec.titulo}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                      <span className="text-xs text-slate-700">Documento adjunto disponible para lectura o descarga.</span>
                                      <a 
                                        href={rec.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm"
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
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ==================================================== */}
              {/* VISTA 2: MENÚ "MIS CURSOS" */}
              {/* ==================================================== */}
              {menuActivo === 'cursos' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">Catálogo de Mis Cursos Activos</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Haz clic en cualquier curso para acceder a sus clases y materiales.</p>
                  </div>

                  {inscripciones.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
                      <span className="text-3xl">📚</span>
                      <h3 className="text-sm font-bold text-slate-800">No tienes inscripciones registradas</h3>
                      <p className="text-xs text-slate-400">Comunícate con administración para que te asigne a tu curso o taller.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {inscripciones.map((ins) => {
                        const grupoObj = grupos.find(g => Number(g.id) === Number(ins.grupo_id))
                        const cursoObj = cursos.find(c => Number(c.id) === Number(grupoObj?.curso_id))
                        const nombreCurso = cursoObj?.Nombre_curso || cursoObj?.nombre_curso || 'Curso Académico'
                        const nombreGrupo = grupoObj?.nombre_grupo || 'Grupo General'
                        const imagenCurso = cursoObj?.imagen || cursoObj?.imagen_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'
                        
                        const estatusIns = ins.estatus || 'activa'
                        const estaEnBaja = estatusIns === 'baja'
                        const pagosDelGrupo = pagos.filter(p => Number(p.grupo_id) === Number(ins.grupo_id))
                        const tienePagoVencido = pagosDelGrupo.some(p => p.estatus === 'Vencido' || (p.estatus === 'Pendiente' && new Date(p.fecha_vencimiento) < new Date()))

                        const recursosGrupo = recursos.filter(r => Number(r.grupo_id) === Number(ins.grupo_id))

                        return (
                          <div 
                            key={ins.id} 
                            onClick={() => setCursoSeleccionado({ nombreCurso, nombreGrupo, recursos: recursosGrupo, estaEnBaja, tienePagoVencido })}
                            className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl transition cursor-pointer flex flex-col justify-between group"
                          >
                            <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                              <img 
                                src={imagenCurso} 
                                alt={nombreCurso} 
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                              <div className="absolute top-3 left-3 bg-slate-950/70 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                                {nombreGrupo}
                              </div>
                            </div>

                            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                              <div className="space-y-1">
                                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition">{nombreCurso}</h3>
                                <p className="text-xs text-slate-500">{recursosGrupo.length} clases / recursos disponibles</p>
                              </div>

                              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-600">Ingresar al curso →</span>
                                {estaEnBaja ? (
                                  <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-xl font-semibold">Baja</span>
                                ) : tienePagoVencido ? (
                                  <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-xl font-semibold">Pago Pendiente</span>
                                ) : (
                                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-xl font-semibold">Activo</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* VISTA 3: MENÚ "PAGOS Y COMPROBANTES" */}
              {/* ==================================================== */}
              {menuActivo === 'pagos' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h3 className="text-base font-bold text-slate-900">💳 Mis Cuotas y Comprobantes</h3>
                    <span className="text-xs text-slate-500">Sube tus comprobantes para que administración los aplique</span>
                  </div>

                  {pagos.length === 0 ? (
                    <div className="text-center py-16 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No tienes cuotas o pagos registrados actualmente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pagos.map((p, idx) => {
                        const monto = Number(p.monto || p.Monto || 0)
                        const estatus = p.estatus || p.Estatus || 'Pendiente'
                        const fechaVence = p.fecha_vencimiento || p.Fecha_vencimiento || 'Sin fecha'

                        return (
                          <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-900">Cuota #{p.id}</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                                  estatus === 'Pagado' ? 'bg-emerald-50 text-emerald-700' :
                                  estatus === 'Revision' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {estatus === 'Pagado' ? '✓ Pagado' : estatus === 'Revision' ? '⏳ En Revisión' : '⚠️ Pendiente'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">Vencimiento: {fechaVence}</p>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                              <span className="text-base font-extrabold text-slate-900">$ {monto.toLocaleString('es-MX')} MXN</span>
                              
                              {estatus !== 'Pagado' && estatus !== 'Revision' && (
                                <button 
                                  onClick={() => setPagoSeleccionado(p.id)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                                >
                                  📤 Subir Comprobante
                                </button>
                              )}

                              {estatus === 'Revision' && (
                                <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-3.5 py-2 rounded-xl">Comprobante enviado · Validando</span>
                              )}

                              {estatus === 'Pagado' && (
                                <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-3.5 py-2 rounded-xl">Pago Aplicado</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================== */}
              {/* VISTA 4: MENÚ "SESIONES Y TANDAS" */}
              {/* ==================================================== */}
              {menuActivo === 'tandas' && tandaAlumno && (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-8 shadow-lg border border-indigo-500/30 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-indigo-700/50 pb-4">
                    <div>
                      <span className="bg-indigo-500/30 text-indigo-200 text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-indigo-400/20">
                        📍 Sesión Presencial y Compromiso
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-2">{tandaAlumno.tandas_config.nombre}</h3>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
                      📅 <strong>Fecha de tu Misa:</strong> <span className="text-indigo-200">{fechaMisaFormateada}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <span className="text-xs uppercase font-bold text-indigo-300 block mb-1">Pagos Registrados</span>
                      <span className="text-2xl font-extrabold text-white">{pagosHechosTanda} / {totalPagosTanda}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <span className="text-xs uppercase font-bold text-indigo-300 block mb-1">Saldo Pendiente</span>
                      <span className={`text-2xl font-extrabold ${saldoPendienteTanda === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ${saldoPendienteTanda.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
                      <span className="text-xs uppercase font-bold text-indigo-300 block mb-2">Progreso de Tu Compromiso</span>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-indigo-400 h-full transition-all duration-500" 
                          style={{ width: `${(pagosHechosTanda / totalPagosTanda) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* VISTA 5: MENÚ "MI PERFIL" */}
              {/* ==================================================== */}
              {menuActivo === 'perfil' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Información del Perfil</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Tus datos personales registrados en la academia.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Nombre Completo:</span>
                      <span className="text-sm font-extrabold text-slate-900">{nombreAlumno}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Matrícula:</span>
                      <span className="text-sm font-mono font-bold text-indigo-600">#{matriculaAlumno}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico:</span>
                      <span className="text-sm font-medium text-slate-800">{correoAlumno}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-500 uppercase">Teléfono:</span>
                      <span className="text-sm font-medium text-slate-800">{telefonoAlumno}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => setModalPass(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-sm transition"
                    >
                      🔑 Cambiar Contraseña de Acceso
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* MODAL PARA SUBIR COMPROBANTE */}
      {pagoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Subir Comprobante de Pago</h3>
              <p className="text-xs text-slate-500 mt-1">Selecciona la imagen de tu ticket o transferencia bancaria (JPG o PNG).</p>
            </div>

            <form onSubmit={enviarComprobante} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Archivo de Comprobante *</label>
                <input 
                  type="file" 
                  accept="image/*"
                  required
                  onChange={(e) => setArchivoComprobante(e.target.files[0])}
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setPagoSeleccionado(null)} 
                  className="px-5 py-2.5 text-xs font-semibold text-slate-500"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={subiendo} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {subiendo ? 'Subiendo...' : 'Enviar Comprobante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR CONTRASEÑA */}
      {modalPass && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Modificar mi Contraseña</h3>
              <p className="text-xs text-slate-500 mt-1">Ingresa tu nueva clave de acceso personal para el portal.</p>
            </div>

            <form onSubmit={actualizarPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Nueva Contraseña</label>
                <input 
                  type="text" 
                  required
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  placeholder="Ej. MiClave2026*"
                  className="w-full p-4 border border-indigo-200 rounded-2xl text-sm bg-indigo-50/50 outline-none focus:border-indigo-600 font-mono font-bold text-indigo-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalPass(false)} className="px-5 py-2.5 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
