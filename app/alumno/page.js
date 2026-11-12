'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import PortalModals from './PortalModals'

// COMPONENTE AUXILIAR PARA EL BOTÓN INTELIGENTE DE MEET
function BotonClaseEnVivo({ sesion }) {
  const [estaDisponible, setEstaDisponible] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState('')

  useEffect(() => {
    const verificarDisponibilidad = () => {
      const ahora = new Date().getTime()
      const fechaClase = new Date(sesion.fecha_hora).getTime()
      
      const margenPermitido = 15 * 60 * 1000 // 15 minutos antes
      const duracionClase = 2 * 60 * 60 * 1000 // 2 horas de duración estimada

      const tiempoInicioPermitido = fechaClase - margenPermitido
      const tiempoFinClase = fechaClase + duracionClase

      if (ahora >= tiempoInicioPermitido && ahora <= tiempoFinClase) {
        setEstaDisponible(true)
      } else if (ahora < tiempoInicioPermitido) {
        setEstaDisponible(false)
        setMensajeEstado('Disponible 15 mins antes')
      } else {
        setEstaDisponible(false)
        setMensajeEstado('Clase finalizada')
      }
    }

    verificarDisponibilidad()
    const intervalo = setInterval(verificarDisponibilidad, 60000)
    return () => clearInterval(intervalo)
  }, [sesion.fecha_hora])

  if (!sesion.enlace_meet) return null

  return (
    <div>
      {estaDisponible ? (
        <a 
          href={sesion.enlace_meet} 
          target="_blank" 
          rel="noreferrer"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition inline-block animate-pulse"
        >
          Unirme a Clase 🎥
        </a>
      ) : (
        <button 
          disabled
          className="bg-slate-100 text-slate-400 px-4 py-2.5 rounded-2xl text-xs font-semibold cursor-not-allowed border border-slate-200"
        >
          🔒 {mensajeEstado || 'Próximamente'}
        </button>
      )}
    </div>
  )
}

export default function AlumnoPortalPage() {
  const [identificador, setIdentificador] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [alumno, setAlumno] = useState(null)
  
  const [inscripciones, setInscripciones] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [cursosProximos, setCursosProximos] = useState([])
  const [pagos, setPagos] = useState([])
  const [recursos, setRecursos] = useState([])
  const [sesionesGrupo, setSesionesGrupo] = useState([])
  
  // TANDAS Y SESIONES PRESENCIALES
  const [tandaAlumno, setTandaAlumno] = useState(null)
  const [pagosTanda, setPagosTanda] = useState([])

  const [loading, setLoading] = useState(false)

  // NAVEGACIÓN Y MENÚS DEL ALUMNO ('cursos', 'pagos', 'tandas', 'perfil')
  const [menuActivo, setMenuActivo] = useState('cursos')

  // CURSO SELECCIONADO PARA VER SU CLASE ACTIVA
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)

  // RECURSO / CLASE ACTIVA SELECCIONADA DENTRO DEL CURSO
  const [recursoActivo, setRecursoActivo] = useState(null)

  // CURSO SELECCIONADO PARA EL POP-UP DE RECOMENDADOS
  const [cursoPopup, setCursoPopup] = useState(null)

  // Estado para cambiar contraseña
  const [modalPass, setModalPass] = useState(false)
  const [nuevaPass, setNuevaPass] = useState('')

  // ESTADOS PARA SUBIR / ACTUALIZAR COMPROBANTE
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [archivoComprobante, setArchivoComprobante] = useState(null)
  const [subiendo, setSubiendo] = useState(false)

  // RECUPERAR SESIÓN AL RECARGAR LA PÁGINA
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('alumno_session_eac')
    if (sesionGuardada) {
      try {
        const al = JSON.parse(sesionGuardada)
        setAlumno(al)
        cargarDatosPortal(al.id)
      } catch (e) {
        localStorage.removeItem('alumno_session_eac')
      }
    }
  }, [])

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

    localStorage.setItem('alumno_session_eac', JSON.stringify(al))
    setAlumno(al)
    await cargarDatosPortal(al.id)
    setLoading(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('alumno_session_eac')
    setAlumno(null)
  }

  const cargarDatosPortal = async (alumnoId) => {
    const { data: ins } = await supabase.from('inscripciones').select('*').eq('alumno_id', alumnoId)
    setInscripciones(ins || [])

    const { data: grp } = await supabase.from('grupos').select('*')
    setGrupos(grp || [])

    // CARGAR CURSOS CON CÁLCULO DE ESTRELLAS Y VALORACIONES
    const { data: crs } = await supabase.from('cursos').select('*')
    const { data: valData } = await supabase.from('valoraciones').select('curso_id, estrellas')

    const cursosConEstrellas = (crs || []).map(curso => {
      const valoracionesCurso = valData?.filter(v => Number(v.curso_id) === Number(curso.id)) || []
      const total = valoracionesCurso.length
      const suma = valoracionesCurso.reduce((acc, curr) => acc + curr.estrellas, 0)
      const promedio = total > 0 ? (suma / total).toFixed(1) : 0

      return {
        ...curso,
        promedioEstrellas: Number(promedio),
        totalValoraciones: total
      }
    })

    setCursos(cursosConEstrellas || [])

    // CARGAR CURSOS PRÓXIMOS MARCADOS DESDE EL ADMIN
    const { data: prox } = await supabase.from('cursos').select('*').eq('proximo', true)
    setCursosProximos(prox || [])

    const { data: pgs } = await supabase.from('pagos').select('*').eq('alumno_id', alumnoId)
    setPagos(pgs || [])

    const { data: rcs } = await supabase.from('recursos').select('*')
    setRecursos(rcs || [])

    const { data: ses } = await supabase.from('sesiones_grupo').select('*').order('fecha_hora', { ascending: true })
    setSesionesGrupo(ses || [])

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
        .upload(fileName, archivoComprobante, { upsert: true })

      if (uploadError) {
        throw new Error('Error al subir al Storage: ' + uploadError.message)
      }

      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(fileName)

      const publicUrl = urlData?.publicUrl

      if (!publicUrl) {
        throw new Error('No se pudo generar la URL pública de la imagen.')
      }

      const { data: updateData, error: updateError } = await supabase
        .from('pagos')
        .update({
          comprobante_url: publicUrl,
          estatus: 'Revision',
          observaciones: null
        })
        .match({ id: pagoSeleccionado, alumno_id: alumno.id })
        .select()

      if (updateError) {
        throw new Error('Error al actualizar Supabase: ' + updateError.message)
      }

      if (!updateData || updateData.length === 0) {
        const { error: errorFallback } = await supabase
          .from('pagos')
          .update({
            comprobante_url: publicUrl,
            estatus: 'Revision',
            observaciones: null
          })
          .eq('id', pagoSeleccionado)

        if (errorFallback) {
          throw new Error('No se pudo localizar el registro de pago para asociar el comprobante.')
        }
      }

      alert('¡Comprobante enviado y registrado con éxito en la base de datos!')
      setPagoSeleccionado(null)
      setArchivoComprobante(null)
      await cargarDatosPortal(alumno.id)

    } catch (error) {
      alert(error.message)
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans selection:bg-rose-500 selection:text-white">
        <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200/80 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-50 rounded-full blur-3xl -z-10"></div>

          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl mx-auto flex items-center justify-center font-black text-sm shadow-md shadow-rose-600/30">E</div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal del Alumno</h1>
            <p className="text-xs font-semibold text-slate-500">Espiritistas a Cantar · Aula Virtual</p>
          </div>

          <form onSubmit={iniciarSesion} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Matrícula, Teléfono o Correo</label>
              <input 
                type="text" 
                required
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                placeholder="Ej. EAC-3159 o tu teléfono"
                className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none focus:border-rose-500 focus:bg-white font-semibold transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1.5">Contraseña LMS</label>
              <input 
                type="password" 
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none focus:border-rose-500 focus:bg-white font-semibold transition"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl text-xs font-black shadow-lg shadow-rose-600/25 transition cursor-pointer"
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
  const inicialUsuario = nombreAlumno.charAt(0).toUpperCase()

  const pagosHechosTanda = pagosTanda.filter(p => p.estado === 'pagado').length
  const totalPagosTanda = tandaAlumno?.tandas_config?.total_pagos || 10
  const montoPorPagoTanda = tandaAlumno?.tandas_config?.monto_por_pago || 0
  const saldoPendienteTanda = (totalPagosTanda - pagosHechosTanda) * montoPorPagoTanda
  const fechaMisaFormateada = tandaAlumno?.fecha_misa 
    ? new Date(tandaAlumno.fecha_misa).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })
    : 'Por definir'

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 text-sm flex selection:bg-rose-500 selection:text-white">
      
      {/* GESTOR DE POP-UPS */}
      {alumno?.id && <PortalModals alumnoId={alumno.id} />}

      {/* BARRA LATERAL TIPO UNIVERSIDAD */}
      <aside className="w-72 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800/80 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md">
          <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-2xl flex items-center justify-center font-black text-xs shadow-md shadow-rose-600/20">E</div>
          <div className="flex flex-col">
            <span className="font-extrabold text-white text-xs tracking-tight leading-tight">Espiritistas a Cantar</span>
            <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Aula Virtual</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 text-xs font-bold">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-slate-500 font-black">Navegación</div>
          <button 
            onClick={() => { setMenuActivo('cursos'); setCursoSeleccionado(null); setRecursoActivo(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${menuActivo === 'cursos' && !cursoSeleccionado ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <span>📚</span> Mis Cursos
          </button>
          <button 
            onClick={() => setMenuActivo('pagos')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${menuActivo === 'pagos' ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <span>💳</span> Pagos y Comprobantes
          </button>
          {tandaAlumno && (
            <button 
              onClick={() => setMenuActivo('tandas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${menuActivo === 'tandas' ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
            >
              <span>📍</span> Sesiones y Tandas
            </button>
          )}
          <button 
            onClick={() => setMenuActivo('perfil')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition cursor-pointer ${menuActivo === 'perfil' ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
          >
            <span>👤</span> Mi Perfil
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50">
          <button 
            onClick={cerrarSesion} 
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-3 rounded-2xl text-xs font-bold transition text-center cursor-pointer border border-rose-500/20"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        
        {/* HEADER SUPERIOR */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {cursoSeleccionado ? cursoSeleccionado.nombreCurso : 
               menuActivo === 'cursos' ? 'Mis Cursos Activos' :
               menuActivo === 'pagos' ? 'Estado de Cuenta y Pagos' :
               menuActivo === 'tandas' ? 'Compromiso Presencial (Tanda)' : 'Mi Perfil Estudiantil'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-800">{nombreAlumno}</span>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">Matrícula: #{matriculaAlumno}</span>
            </div>
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center font-black text-xs border border-rose-100 shadow-xs">
              {inicialUsuario}
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-8 flex-1">
          
          {/* VISTA 1: DETALLE DEL CURSO SELECCIONADO (ESTILO MODERNO DE DOS COLUMNAS) */}
          {cursoSeleccionado ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => { setCursoSeleccionado(null); setRecursoActivo(null); }}
                  className="text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl w-fit shadow-xs cursor-pointer"
                >
                  ← Volver a Mis Cursos
                </button>
                <a 
                  href="https://wa.me/525650426741?text=Hola,%20tengo%20dudas%20con%20el%20contenido%20de%20mi%20curso." 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl shadow-xs cursor-pointer"
                >
                  <span>💬</span> Soporte por WhatsApp
                </a>
              </div>

              {cursoSeleccionado.estaEnBaja ? (
                <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">🔴</div>
                  <h3 className="text-lg font-black text-slate-900">Acceso Suspendido</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                    Actualmente te encuentras dado de baja de este curso. Si deseas reincorporarte, comunícate con administración.
                  </p>
                </div>
              ) : cursoSeleccionado.tienePagoVencido ? (
                <div className="bg-white rounded-3xl border border-rose-200 p-12 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">⚠️</div>
                  <h3 className="text-lg font-black text-slate-900">Acceso Pausado por Cuota Pendiente</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                    Tienes pagos pendientes o vencidos correspondientes a este grupo. Para desbloquear las clases y materiales, por favor regulariza tu pago y sube tu comprobante en la sección de Pagos.
                  </p>
                  <button 
                    onClick={() => setMenuActivo('pagos')}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl text-xs font-black transition shadow-md shadow-rose-600/20 inline-block cursor-pointer"
                  >
                    Ir a Pagos y Subir Comprobante →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* COLUMNA IZQUIERDA: REPRODUCTOR / CONTENIDO ACTIVO */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Tarjeta del Reproductor Principal */}
                    <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
                      {recursoActivo ? (
                        <div className="space-y-4">
                          {recursoActivo.tipo === 'video' ? (
                            <div className="aspect-video w-full bg-slate-950">
                              <iframe 
                                src={obtenerUrlIncrustada(recursoActivo.url)} 
                                title={recursoActivo.titulo}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <div className="p-12 text-center space-y-4 bg-slate-50 border-b border-slate-100">
                              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">📄</div>
                              <h3 className="text-lg font-black text-slate-900">{recursoActivo.titulo}</h3>
                              <p className="text-xs text-slate-500 font-medium">Documento PDF disponible para visualización o descarga.</p>
                              <a 
                                href={recursoActivo.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl text-xs font-bold inline-block shadow-md transition"
                              >
                                Abrir / Descargar PDF ↗
                              </a>
                            </div>
                          )}
                          <div className="p-6">
                            <span className="text-[10px] bg-rose-50 text-rose-700 font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider border border-rose-100">
                              {recursoActivo.tipo === 'video' ? 'Clase Grabada' : 'Material PDF'}
                            </span>
                            <h2 className="text-xl font-black text-slate-900 mt-2">{recursoActivo.titulo}</h2>
                          </div>
                        </div>
                      ) : (
                        <div className="p-12 text-center space-y-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl">
                          <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-rose-500/30">🎓</div>
                          <h3 className="text-xl font-black">Bienvenido a {cursoSeleccionado.nombreCurso}</h3>
                          <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
                            Selecciona una clase o material en el panel de la derecha para comenzar a reproducir tu contenido.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* SECCIÓN DE CLASES EN VIVO / MEET O PRESENCIAL SI APLICA */}
                    {(() => {
                      const modalidad = cursoSeleccionado.tipoModalidad || 'en_linea';
                      if (cursoSeleccionado.sesiones.length === 0) return null;

                      return (
                        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs">
                          <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest">Sesiones y Clases en Vivo</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {cursoSeleccionado.sesiones.map((sesion) => (
                              <div key={sesion.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                  <span className="text-xs font-extrabold text-slate-900 block">Sesión {sesion.numero_sesion}: {sesion.titulo_sesion}</span>
                                  <span className="text-[11px] text-slate-500 font-medium">🕒 {new Date(sesion.fecha_hora).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}</span>
                                </div>
                                {(modalidad === 'en_linea' || modalidad === 'hibrido') && <BotonClaseEnVivo sesion={sesion} />}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                  </div>

                  {/* COLUMNA DERECHA: CONTENIDO DEL TALLER / ÍNDICE DE CLASES */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-6 space-y-4 shadow-xs sticky top-28">
                      <div className="border-b border-slate-100 pb-3">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Temario del curso</span>
                        <h3 className="text-base font-black text-slate-900">{cursoSeleccionado.nombreCurso}</h3>
                      </div>

                      {cursoSeleccionado.recursos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-6 text-center">No hay materiales cargados aún.</p>
                      ) : (
                        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                          {cursoSeleccionado.recursos.map((rec, index) => {
                            const esActivo = recursoActivo?.id === rec.id;
                            return (
                              <div 
                                key={rec.id} 
                                onClick={() => setRecursoActivo(rec)}
                                className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                                  esActivo 
                                    ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-xs' 
                                    : 'bg-slate-50/60 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <span className={`text-[10px] font-black uppercase tracking-wider block ${esActivo ? 'text-rose-600' : 'text-slate-400'}`}>
                                    Clase {index + 1}
                                  </span>
                                  <h5 className="text-xs font-extrabold line-clamp-1">{rec.titulo}</h5>
                                </div>
                                <span className="text-xs flex-shrink-0">
                                  {rec.tipo === 'video' ? '▶' : '📄'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : (
            <>
              {/* VISTA 2: MENÚ "MIS CURSOS" */}
              {menuActivo === 'cursos' && (
                <div className="space-y-12">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">Catálogo de Mis Cursos Activos</h2>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">Haz clic en cualquier curso para acceder a tus clases, grabaciones y materiales.</p>
                    </div>

                    {inscripciones.length === 0 ? (
                      <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
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
                          const tipoModalidad = grupoObj?.tipo_modalidad || 'en_linea'
                          const imagenCurso = cursoObj?.imagen || cursoObj?.imagen_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'
                          
                          const estatusIns = ins.estatus || 'activa'
                          const estaEnBaja = estatusIns === 'baja'
                          const pagosDelGrupo = pagos.filter(p => Number(p.grupo_id) === Number(ins.grupo_id))
                          const tienePagoVencido = pagosDelGrupo.some(p => p.estatus === 'Vencido' || (p.estatus === 'Pendiente' && new Date(p.fecha_vencimiento) < new Date()))

                          const recursosGrupo = recursos.filter(r => Number(r.grupo_id) === Number(ins.grupo_id))
                          const sesionesGrupoItem = sesionesGrupo.filter(s => Number(s.grupo_id) === Number(ins.grupo_id))

                          return (
                            <div 
                              key={ins.id} 
                              onClick={() => {
                                setCursoSeleccionado({ nombreCurso, nombreGrupo, tipoModalidad, recursos: recursosGrupo, sesiones: sesionesGrupoItem, estaEnBaja, tienePagoVencido });
                                if (recursosGrupo.length > 0) setRecursoActivo(recursosGrupo[0]);
                              }}
                              className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between group"
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
                                <div className="absolute top-3 right-3 bg-rose-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                  {tipoModalidad === 'presencial' ? '📍 Presencial' : tipoModalidad === 'hibrido' ? '🔀 Híbrido' : '💻 En Línea'}
                                </div>
                              </div>

                              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-2">
                                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-rose-600 transition">{nombreCurso}</h3>
                                  
                                  {/* ESTRELLAS Y VALORACIÓN PROMEDIO */}
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex text-amber-400 text-xs">
                                      {[1, 2, 3, 4, 5].map((num) => {
                                        const promedio = cursoObj?.promedioEstrellas || 0
                                        return (
                                          <span key={num}>
                                            {num <= Math.round(promedio) ? '★' : '☆'}
                                          </span>
                                        )
                                      })}
                                    </div>
                                    <span className="text-xs font-black text-slate-800">
                                      {cursoObj?.promedioEstrellas > 0 ? cursoObj.promedioEstrellas : 'Nuevo'}
                                    </span>
                                    {cursoObj?.totalValoraciones > 0 && (
                                      <span className="text-[10px] text-slate-400 font-medium">({cursoObj.totalValoraciones})</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-500 font-medium">{sesionesGrupoItem.length} sesiones · {recursosGrupo.length} materiales</p>
                                </div>

                                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-xs font-bold text-rose-600">Ingresar al curso →</span>
                                  {estaEnBaja ? (
                                    <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-xl font-semibold">Baja</span>
                                  ) : tienePagoVencido ? (
                                    <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-1 rounded-xl font-semibold">Pago Pendiente</span>
                                  ) : (
                                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl font-semibold">Activo</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* NUEVA SECCIÓN: CURSOS QUE PODRÍAN INTERESARTE */}
                  {cursosProximos.length > 0 && (
                    <div className="space-y-6 pt-6 border-t border-slate-200/80">
                      <div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight">Cursos que podrían interesarte</h2>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">Explora nuestros próximos programas y aparta tu lugar.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cursosProximos.map((cur) => {
                          const nombreCur = cur.Nombre_curso || cur.nombre_curso || 'Curso Próximo'
                          const imagenCur = cur.imagen || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'
                          
                          const gruposDelCurso = grupos.filter(g => Number(g.curso_id) === Number(cur.id))
                          const grupoProximo = gruposDelCurso.sort((a, b) => new Date(a.fecha_inicio || a.created_at) - new Date(b.fecha_inicio || b.created_at))[0]

                          const precioGrupo = grupoProximo?.precio || cur.precio || 0
                          const precioCur = Number(precioGrupo).toLocaleString('es-MX', { minimumFractionDigits: 2 })

                          return (
                            <div key={cur.id} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col justify-between">
                              <div>
                                <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                                  <img 
                                    src={imagenCur} 
                                    alt={nombreCur} 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="p-6 space-y-2">
                                  <h3 className="text-base font-extrabold text-slate-900">{nombreCur}</h3>
                                  <p className="text-xs text-slate-500 line-clamp-2 font-medium">{cur.descripcion || 'Próximamente disponible en nuestra academia.'}</p>
                                </div>
                              </div>

                              <div className="p-6 pt-0 flex items-center justify-between">
                                <span className="text-base font-black text-slate-900">${precioCur} MXN</span>
                                <button 
                                  onClick={() => setCursoPopup({ ...cur, _grupoProximo: grupoProximo })}
                                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition cursor-pointer"
                                >
                                  Más información del curso
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 3: MENÚ "PAGOS Y COMPROBANTES" */}
              {menuActivo === 'pagos' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h3 className="text-base font-black text-slate-900">💳 Mis Cuotas y Comprobantes</h3>
                    <span className="text-xs text-slate-500 font-medium">Sube tu comprobante o corrígelo si fue rechazado</span>
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
                        const tieneComprobanteSubido = p.comprobante_url
                        const observaciones = p.observaciones || ''
                        const esRechazado = observaciones.toLowerCase().includes('rechazado')

                        return (
                          <div key={idx} className="bg-slate-50/50 border border-slate-200/80 rounded-2xl p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-black text-slate-900">Cuota #{p.id}</span>
                                  <span className={`text-xs px-3 py-1 rounded-full font-extrabold ${
                                    estatus === 'Pagado' ? 'bg-emerald-50 text-emerald-700' :
                                    estatus === 'Revision' ? 'bg-amber-50 text-amber-700' : 
                                    esRechazado ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                                  }`}>
                                    {estatus === 'Pagado' ? '✓ Pagado' : estatus === 'Revision' ? '⏳ En Revisión' : esRechazado ? '❌ Rechazado' : '⚠️ Pendiente'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium">Vencimiento: {fechaVence}</p>
                              </div>

                              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <span className="text-base font-black text-slate-900">$ {monto.toLocaleString('es-MX')} MXN</span>
                                
                                {estatus === 'Pagado' ? (
                                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3.5 py-2 rounded-xl">Pago Validado</span>
                                ) : tieneComprobanteSubido ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-2 rounded-xl">En Revisión</span>
                                    <button 
                                      onClick={() => setPagoSeleccionado(p.id)}
                                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                                    >
                                      🔄 Cambiar Comprobante
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setPagoSeleccionado(p.id)}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition shadow-md shadow-rose-600/20 cursor-pointer"
                                  >
                                    📤 Subir Comprobante
                                  </button>
                                )}
                              </div>
                            </div>

                            {esRechazado && (
                              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-800 space-y-1">
                                <div className="font-extrabold flex items-center gap-1.5">
                                  <span>⚠️ Comprobante Rechazado por Administración:</span>
                                </div>
                                <p className="text-rose-700 pl-5 font-medium">{observaciones}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 4: MENÚ "SESIONES Y TANDAS" */}
              {menuActivo === 'tandas' && tandaAlumno && (
                <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -z-10"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <span className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest border border-rose-500/30">
                        📍 Sesión Presencial y Compromiso
                      </span>
                      <h3 className="text-xl font-black text-white mt-2">{tandaAlumno.tandas_config.nombre}</h3>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-xs font-semibold">
                      📅 <strong>Fecha de tu Misa:</strong> <span className="text-rose-400">{fechaMisaFormateada}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-1">Pagos Registrados</span>
                      <span className="text-2xl font-black text-white">{pagosHechosTanda} / {totalPagosTanda}</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-1">Saldo Pendiente</span>
                      <span className={`text-2xl font-black ${saldoPendienteTanda === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ${saldoPendienteTanda.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block mb-2">Progreso de Tu Compromiso</span>
                      <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
                        <div 
                          className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${(pagosHechosTanda / totalPagosTanda) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA 5: MENÚ "MI PERFIL" */}
              {menuActivo === 'perfil' && (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6 max-w-2xl">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Información del Perfil</h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">Tus datos personales registrados en la academia.</p>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre Completo:</span>
                      <span className="text-sm font-black text-slate-900">{nombreAlumno}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matrícula:</span>
                      <span className="text-sm font-mono font-black text-rose-600">#{matriculaAlumno}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correo Electrónico:</span>
                      <span className="text-sm font-semibold text-slate-800">{correoAlumno}</span>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teléfono:</span>
                      <span className="text-sm font-semibold text-slate-800">{telefonoAlumno}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => setModalPass(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-sm transition cursor-pointer"
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

      {/* POP-UP / MODAL DE INFORMACIÓN DEL CURSO PRÓXIMO */}
      {cursoPopup && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            <button 
              onClick={() => setCursoPopup(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-4">
              <img 
                src={cursoPopup.imagen || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'} 
                alt="Banner curso" 
                className="w-full h-56 object-cover rounded-2xl border border-slate-100 shadow-xs"
              />
              <div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">Próximo Lanzamiento</span>
                  {cursoPopup._grupoProximo?.fecha_inicio && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      📅 Inicia: {new Date(cursoPopup._grupoProximo.fecha_inicio).toLocaleDateString('es-MX', { dateStyle: 'medium', timeZone: 'UTC' })}
                    </span>
                  )}
                  {cursoPopup._grupoProximo?.tipo_modalidad && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                      💻 {cursoPopup._grupoProximo.tipo_modalidad.toUpperCase()}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-slate-900">{cursoPopup.Nombre_curso || cursoPopup.nombre_curso}</h2>
                {cursoPopup._grupoProximo?.nombre_grupo && (
                  <p className="text-xs font-bold text-rose-600 mt-1">Grupo asignado: {cursoPopup._grupoProximo.nombre_grupo}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Acerca del curso</h4>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
                  {cursoPopup.descripcion || 'Sin descripción detallada disponible.'}
                </p>
              </div>

              {/* Lo que aprenderás */}
              {cursoPopup.lo_que_aprenderas && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Lo que aprenderás</h4>
                  <div className="text-sm text-slate-700 leading-relaxed bg-rose-50/40 p-4 rounded-2xl border border-rose-100 whitespace-pre-line font-medium">
                    {cursoPopup.lo_que_aprenderas}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Inversión del Grupo</span>
                <span className="text-2xl font-black text-white">
                  ${Number(cursoPopup._grupoProximo?.precio || cursoPopup.precio || 0).toLocaleString('es-MX')} MXN
                </span>
              </div>

              <a 
                href={`https://wa.me/525650426741?text=${encodeURIComponent(`Hola, deseo inscribirme al curso: ${cursoPopup.Nombre_curso || cursoPopup.nombre_curso} (${cursoPopup._grupoProximo?.nombre_grupo || 'Próximo grupo'})`)}`}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>💬</span> Inscribirme por WhatsApp
              </a>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PARA SUBIR O CAMBIAR COMPROBANTE */}
      {pagoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">Subir o Actualizar Comprobante</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Selecciona la imagen de tu ticket o transferencia bancaria (JPG o PNG).</p>
            </div>

            <form onSubmit={enviarComprobante} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nuevo Archivo *</label>
                <input 
                  type="file" 
                  accept="image/*"
                  required
                  onChange={(e) => setArchivoComprobante(e.target.files[0])}
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setPagoSeleccionado(null)} 
                  className="px-5 py-2.5 text-xs font-bold text-slate-500 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={subiendo} 
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl text-xs font-black transition shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {subiendo ? 'Actualizando...' : 'Enviar Comprobante'}
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
              <h3 className="text-lg font-black text-slate-900">Modificar mi Contraseña</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Ingresa tu nueva clave de acceso personal para el portal.</p>
            </div>

            <form onSubmit={actualizarPassword} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nueva Contraseña</label>
                <input 
                  type="text" 
                  required
                  value={nuevaPass}
                  onChange={(e) => setNuevaPass(e.target.value)}
                  placeholder="Ej. MiClave2026*"
                  className="w-full p-4 border border-rose-200 rounded-2xl text-sm bg-rose-50/30 outline-none focus:border-rose-600 font-mono font-bold text-rose-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalPass(false)} className="px-5 py-2.5 text-xs font-bold text-slate-500 cursor-pointer">Cancelar</button>
                <button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl text-xs font-black transition shadow-md shadow-rose-600/20 cursor-pointer">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
