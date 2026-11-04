'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    alumnosConCursoActivo: 0,
    totalGrupos: 0,
    cobradoMes: 0,
    pendienteMes: 0,
    bajasMes: 0,
    cursoPopular: 'Cargando...',
    inscripcionesCursoPopular: 0
  })
  
  const [clasesHoy, setClasesHoy] = useState([])
  const [cumpleaneros, setCumpleaneros] = useState([])
  const [loading, setLoading] = useState(true)

  const fechaActualTexto = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    cargarMetricasReales()
  }, [])

  const cargarMetricasReales = async () => {
    setLoading(true)

    try {
      const ahora = new Date()

      // 1. Estudiantes (Total, Bajas y Cumpleaños)
      const { data: alumnosData, error: errAlumnos } = await supabase
        .from('alumnos')
        .select('*')

      if (errAlumnos) console.error("Error alumnos:", errAlumnos)

      const totalActual = alumnosData ? alumnosData.length : 0
      let countBajas = 0
      const proximosCumples = []

      if (alumnosData) {
        alumnosData.forEach(alumno => {
          // Bajas
          const estatus = (alumno.estatus || alumno.Estatus || alumno.estado || alumno.Estado || '').toLowerCase()
          if (estatus === 'baja') countBajas++

          // Cumpleaños
          const fechaNacString = alumno.fecha_nacimiento || alumno.Fecha_nacimiento
          if (fechaNacString) {
            const fechaNac = new Date(fechaNacString)
            fechaNac.setFullYear(ahora.getFullYear())
            
            const diffTime = fechaNac - ahora
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            if (diffDays < 0) {
              fechaNac.setFullYear(ahora.getFullYear() + 1)
            }
            
            const newDiff = Math.ceil((fechaNac - ahora) / (1000 * 60 * 60 * 24))
            
            if (newDiff >= 0 && newDiff <= 15) {
              const nombreReal = alumno.nombre || alumno.Nombre || ''
              const apellidosReales = alumno.apellidos || alumno.Apellidos || ''
              
              proximosCumples.push({
                ...alumno,
                nombreCompleto: `${nombreReal} ${apellidosReales}`.trim(),
                telefonoReal: alumno.telefono || alumno.Telefono || alumno.celular || alumno.Celular,
                diasFaltantes: newDiff,
                fechaFormateada: fechaNac.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
              })
            }
          }
        })
        proximosCumples.sort((a, b) => a.diasFaltantes - b.diasFaltantes)
      }

      // 2. Grupos
      const { count: countGrupos } = await supabase
        .from('grupos')
        .select('*', { count: 'exact', head: true })

      // 3. Inscripciones, Grupos y Cursos (Consultas separadas para evitar errores de llaves foráneas)
      const { data: inscripcionesData } = await supabase.from('inscripciones').select('*')
      const { data: gruposFullData } = await supabase.from('grupos').select('*')
      const { data: cursosFullData } = await supabase.from('cursos').select('*')

      let alumnosUnicosConCurso = 0
      let cursoMasPopular = 'Sin datos'
      let maxInscripciones = 0

      if (inscripcionesData && inscripcionesData.length > 0) {
        // 3.1 Calcular Alumnos Activos (Únicos)
        const idsUnicos = new Set()
        inscripcionesData.forEach(ins => {
          const idAlumno = ins.alumno_id || ins.Alumno_id || ins.alumnos_id || ins.id_alumno
          if (idAlumno) idsUnicos.add(idAlumno)
        })
        alumnosUnicosConCurso = idsUnicos.size

        // 3.2 Calcular Curso Más Popular del Año
        const inscripcionesEsteAnio = inscripcionesData.filter(ins => {
          const fechaIns = new Date(ins.created_at || ins.fecha || ins.Fecha || ahora)
          return fechaIns.getFullYear() === ahora.getFullYear()
        })

        const conteoCursos = {}
        
        inscripcionesEsteAnio.forEach(ins => {
          // Encontrar el grupo de esta inscripción
          const idGrupo = ins.grupo_id || ins.Grupo_id || ins.grupos_id || ins.id_grupo
          const grupoRelacionado = gruposFullData?.find(g => g.id === idGrupo || g.Id === idGrupo)
          
          if (grupoRelacionado) {
            // Encontrar el curso de este grupo
            const idCurso = grupoRelacionado.curso_id || grupoRelacionado.Curso_id || grupoRelacionado.cursos_id || grupoRelacionado.id_curso
            const cursoRelacionado = cursosFullData?.find(c => c.id === idCurso || c.Id === idCurso)
            
            // Extraer el nombre
            const nombreCurso = cursoRelacionado?.nombre_curso || cursoRelacionado?.Nombre_curso || cursoRelacionado?.nombre || 'Curso General'
            
            conteoCursos[nombreCurso] = (conteoCursos[nombreCurso] || 0) + 1
          }
        })

        // Determinar el ganador
        for (const [curso, cantidad] of Object.entries(conteoCursos)) {
          if (cantidad > maxInscripciones) {
            maxInscripciones = cantidad
            cursoMasPopular = curso
          }
        }
      }

      // 4. Pagos (Ingresos y Pendientes del mes en curso)
      const { data: dataPagos, error: errPagos } = await supabase
        .from('pagos')
        .select('*')

      if (errPagos) console.error("Error pagos:", errPagos)

      let cobrado = 0
      let pendiente = 0

      if (dataPagos) {
        dataPagos.forEach(p => {
          const fechaRefStr = p.created_at || p.fecha_pago || p.Fecha_pago || p.fecha || p.Fecha
          let esDeEsteMes = false
          
          if (fechaRefStr) {
             const f = new Date(fechaRefStr)
             if (f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear()) {
               esDeEsteMes = true
             }
          } else {
             esDeEsteMes = true 
          }

          if (esDeEsteMes) {
            const monto = Number(p.monto || p.Monto || p.cantidad || p.Cantidad || 0)
            const estatus = (p.estatus || p.Estatus || p.estado || p.Estado || '').toLowerCase()

            if (estatus === 'pagado' || estatus === 'completado' || estatus === 'paid') {
              cobrado += monto
            } else {
              pendiente += monto
            }
          }
        })
      }

      // 5. Hoy en la Academia
      const { data: sesionesData, error: errSesiones } = await supabase
        .from('sesiones_grupo')
        .select(`
          *,
          grupos (
            nombre_grupo,
            tipo_modalidad,
            cursos (
              Nombre_curso,
              nombre_curso
            )
          )
        `)
        
      if (errSesiones) console.error("Error sesiones:", errSesiones)

      let sesionesHoyFiltradas = []
      if (sesionesData) {
        const anioHoy = ahora.getFullYear()
        const mesHoy = ahora.getMonth()
        const diaHoy = ahora.getDate()
        
        sesionesHoyFiltradas = sesionesData.filter(s => {
          if (!s.fecha_hora) return false
          const fechaSesion = new Date(s.fecha_hora)
          return (
            fechaSesion.getFullYear() === anioHoy &&
            fechaSesion.getMonth() === mesHoy &&
            fechaSesion.getDate() === diaHoy
          )
        })
      }

      setStats({
        totalEstudiantes: totalActual,
        alumnosConCursoActivo: alumnosUnicosConCurso,
        totalGrupos: countGrupos || 0,
        cobradoMes: cobrado,
        pendienteMes: pendiente,
        bajasMes: countBajas,
        cursoPopular: maxInscripciones > 0 ? cursoMasPopular : 'Sin datos',
        inscripcionesCursoPopular: maxInscripciones
      })

      setClasesHoy(sesionesHoyFiltradas)
      setCumpleaneros(proximosCumples)

    } catch (error) {
      console.error("Error al cargar métricas:", error)
    } finally {
      setLoading(false)
    }
  }

  const generarEnlaceWhatsApp = (telefono, nombre) => {
    if (!telefono) return '#'
    const numeroLimpio = String(telefono).replace(/\D/g, '')
    const primerNombre = nombre ? nombre.split(' ')[0] : 'Alumno'
    const mensaje = `¡Hola ${primerNombre}! De parte de toda la familia de Espiritistas a Cantar, te deseamos un muy feliz cumpleaños. 🎂✨ Esperamos que pases un día maravilloso.`
    return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900 text-sm">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight">Espiritistas a Cantar</span>
              <span className="text-xs text-indigo-400 font-medium">Panel Administrativo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto text-sm font-medium">
          <div className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Gestión Escolar</div>
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold shadow-sm">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          
          <div className="pt-4 px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Finanzas y Control</div>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
          <a href="/admin/comprobantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🧾 Comprobantes</a>
          <a href="/admin/calendario" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📅 Calendario General</a>
          
          <div className="pt-6 px-3 pb-2 text-xs uppercase tracking-wider text-indigo-400 font-bold">Presencial</div>
          <a href="/admin/tandas" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-950/80 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-900 transition">📍 Tandas y Misas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div className="flex flex-col">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Portal de Inicio</h1>
            <span className="text-xs text-slate-500 font-medium capitalize">{fechaActualTexto}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="/admin/estudiantes/nuevo" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-sm flex items-center gap-2">
              <span>➕</span> Nuevo Alumno
            </a>
            <a href="/admin/inscripciones/nueva" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-sm flex items-center gap-2">
              <span>📋</span> Nueva Inscripción
            </a>
          </div>
        </header>

        <div className="p-8 max-w-[1700px] mx-auto w-full space-y-8">
          
          {/* PRIMERA FILA: MÉTRICAS GENERALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            
            {/* Alumnos Activos / Totales */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col justify-center lg:col-span-2 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-slate-50 text-9xl opacity-50 select-none">🎓</div>
              <div className="relative z-10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estudiantes</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-4xl font-black text-indigo-600 tracking-tighter">{stats.alumnosConCursoActivo}</h3>
                  <span className="text-xl font-bold text-slate-400">/ {stats.totalEstudiantes}</span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Activos vs Registrados en DB</p>
              </div>
            </div>

            {/* Grupos */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Grupos</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter mt-1">{stats.totalGrupos}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Activos actualmente</p>
            </div>

            {/* Ingresos del Mes */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Ingresos del Mes</span>
              <h3 className="text-2xl font-black text-emerald-600 tracking-tight mt-1">
                ${stats.cobradoMes.toLocaleString('es-MX')}
              </h3>
              <p className="text-xs text-emerald-600/70 font-medium mt-1">Pagado este mes</p>
            </div>

            {/* Por Cobrar del Mes */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Por Cobrar</span>
              <h3 className="text-2xl font-black text-rose-600 tracking-tight mt-1">
                ${stats.pendienteMes.toLocaleString('es-MX')}
              </h3>
              <p className="text-xs text-rose-600/70 font-medium mt-1">Pendiente este mes</p>
            </div>

            {/* Bajas del mes */}
            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bajas Mensuales</span>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter mt-1">{stats.bajasMes}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Alumnos dados de baja</p>
            </div>
          </div>

          {/* SEGUNDA FILA: CURSO POPULAR, HOY EN LA ACADEMIA, CUMPLEAÑOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Curso Popular y Cumpleaños */}
            <div className="space-y-8">
              
              {/* Curso Más Popular */}
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[1.5rem] shadow-sm text-white relative overflow-hidden">
                <div className="absolute right-0 bottom-0 text-white/5 text-8xl transform translate-x-4 translate-y-4">🏆</div>
                <div className="relative z-10 space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest bg-indigo-950/50 px-3 py-1 rounded-full">Tendencia Anual</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-300">Curso más popular del año</p>
                    <h3 className="text-2xl font-black text-white leading-tight mt-1">{stats.cursoPopular}</h3>
                  </div>
                  <div className="inline-block bg-indigo-600/40 border border-indigo-500/30 px-4 py-2 rounded-xl backdrop-blur-sm">
                    <span className="font-extrabold text-lg text-white">{stats.inscripcionesCursoPopular}</span>
                    <span className="text-xs font-medium text-indigo-200 ml-2">inscripciones totales</span>
                  </div>
                </div>
              </div>

              {/* Próximos Cumpleaños */}
              <div className="bg-white p-8 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-extrabold text-slate-900">🎂 Próximos Cumpleaños</h3>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Próx. 15 días</span>
                </div>
                
                {loading ? (
                  <div className="text-center py-6 text-sm text-slate-400">Buscando festejados...</div>
                ) : cumpleaneros.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No hay cumpleaños próximos.
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px] pr-2">
                    {cumpleaneros.map((alumno, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-slate-900 line-clamp-1">{alumno.nombreCompleto}</p>
                          <p className="text-xs text-indigo-600 font-semibold">{alumno.fechaFormateada} 
                            <span className="text-slate-400 font-normal ml-1">
                              ({alumno.diasFaltantes === 0 ? '¡Hoy!' : `en ${alumno.diasFaltantes} días`})
                            </span>
                          </p>
                        </div>
                        {alumno.telefonoReal ? (
                          <a 
                            href={generarEnlaceWhatsApp(alumno.telefonoReal, alumno.nombreCompleto)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white p-2.5 rounded-xl transition-colors shrink-0"
                            title="Enviar felicitación por WhatsApp"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564c.173.087.289.129.332.202.043.073.043.423-.101.827z"/></svg>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">Sin número</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Hoy en la Academia */}
            <div className="bg-white p-8 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col lg:col-span-2">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-extrabold text-slate-900">📅 Hoy en la Academia</h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-wider">{fechaActualTexto}</span>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-400">Cargando actividades del día...</div>
              ) : clasesHoy.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-10 text-center">
                  No hay clases o sesiones programadas para el día de hoy.
                </div>
              ) : (
                <div className="space-y-4 overflow-y-auto pr-2">
                  {clasesHoy.map((sesion) => {
                    const nombreCurso = sesion.grupos?.cursos?.Nombre_curso || sesion.grupos?.cursos?.nombre_curso || 'Curso Académico'
                    const nombreGrupo = sesion.grupos?.nombre_grupo || 'Grupo'
                    const modalidad = sesion.grupos?.tipo_modalidad || 'en_linea'
                    const horaSesion = new Date(sesion.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <div key={sesion.id} className="p-5 rounded-[1.25rem] bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-colors flex justify-between items-center group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Sesión {sesion.numero_sesion}: {sesion.titulo_sesion}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              modalidad === 'presencial' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {modalidad === 'presencial' ? '📍 Presencial' : '💻 En Línea'}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{nombreCurso} <span className="text-slate-400 font-medium mx-1">•</span> <span className="text-slate-600 font-semibold">{nombreGrupo}</span></h4>
                          <p className="text-xs text-slate-500 font-medium">🕒 {horaSesion} hrs {modalidad === 'presencial' ? `• Salón: ${sesion.enlace_meet || 'Principal'}` : ''}</p>
                        </div>
                        <span className="bg-white text-slate-900 border border-slate-200 text-[11px] font-bold px-4 py-2 rounded-xl shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                          Programada
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
