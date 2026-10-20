'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    crecimientoMatricula: 0,
    estadoMatricula: 'igual',
    totalGrupos: 0,
    totalCobrado: 0,
    totalPendiente: 0,
    bajasMes: 0,
    tasaOcupacion: 0,
    alumnosConCursoActivo: 0
  })
  
  const [clasesHoy, setClasesHoy] = useState([])
  const [pagosPendientes, setPagosPendientes] = useState([])
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
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
      const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString()
      const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString()

      // 1. Estudiantes Activos
      const { count: countAlumnos } = await supabase
        .from('alumnos')
        .select('*', { count: 'exact', head: true })

      const { count: countAlumnosMesPasado } = await supabase
        .from('alumnos')
        .select('*', { count: 'exact', head: true })
        .lte('created_at', ultimoDiaMesAnterior)

      const totalActual = countAlumnos || 0
      const totalAnterior = countAlumnosMesPasado || 0
      let tendencia = 'igual'
      let diferenciaMatricula = totalActual - totalAnterior

      if (diferenciaMatricula > 0) tendencia = 'crecio'
      else if (diferenciaMatricula < 0) tendencia = 'decrecio'

      // 2. Grupos
      const { count: countGrupos } = await supabase
        .from('grupos')
        .select('*', { count: 'exact', head: true })

      // 3. Bajas del mes
      const { count: countBajas } = await supabase
        .from('alumnos')
        .select('*', { count: 'exact', head: true })
        .or('estatus.eq.Baja,estado.eq.Baja')
        .gte('updated_at', primerDiaMes)
        .lte('updated_at', ultimoDiaMes)

      // 4. Inscripciones / Ocupación
      const { data: inscripcionesData } = await supabase
        .from('inscripciones')
        .select('*')

      let alumnosUnicosConCurso = 0
      if (inscripcionesData && inscripcionesData.length > 0) {
        const idsUnicos = new Set(inscripcionesData.map(i => i.alumno_id || i.Alumno_id || i.alumnos_id))
        alumnosUnicosConCurso = idsUnicos.size
      } else {
        alumnosUnicosConCurso = totalActual
      }
      
      const tasaOcupacionCalc = totalActual > 0 ? Math.round((alumnosUnicosConCurso / totalActual) * 100) : 0

      // 5. Pagos
      const { data: dataPagos, error: errPagos } = await supabase
        .from('pagos')
        .select('*')

      let cobrado = 0
      let pendiente = 0
      let pendientesLista = []

      if (!errPagos && dataPagos) {
        dataPagos.forEach(p => {
          const monto = Number(p.monto || p.Monto || p.cantidad || 0)
          const estatus = (p.estatus || p.Estatus || p.estado || p.Estado || '').toLowerCase()

          if (estatus === 'pagado' || estatus === 'completado' || estatus === 'paid') {
            cobrado += monto
          } else {
            pendiente += monto
            pendientesLista.push(p)
          }
        })
      }

      // 6. Hoy en la Academia (Corrección de zona horaria local)
      const { data: sesionesData } = await supabase
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
        crecimientoMatricula: diferenciaMatricula,
        estadoMatricula: tendencia,
        totalGrupos: countGrupos || 0,
        totalCobrado: cobrado,
        totalPendiente: pendiente,
        bajasMes: countBajas || 0,
        tasaOcupacion: tasaOcupacionCalc > 100 ? 100 : tasaOcupacionCalc,
        alumnosConCursoActivo: alumnosUnicosConCurso
      })

      setClasesHoy(sesionesHoyFiltradas)
      setPagosPendientes(pendientesLista)

    } catch (error) {
      console.error("Error al cargar métricas:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900 text-sm">
      
      {/* SIDEBAR CON TODAS LAS FUNCIONES */}
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
            <h1 className="text-lg font-extrabold text-slate-900">Inicio</h1>
            <span className="text-xs text-slate-500 capitalize">Espiritistas a Cantar • {fechaActualTexto}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="/admin/estudiantes/nuevo" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-sm flex items-center gap-2">
              <span>➕</span> Nuevo Alumno
            </a>
            <a href="/admin/inscripciones/nueva" className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition shadow-sm flex items-center gap-2">
              <span>📋</span> Nueva Inscripción
            </a>
          </div>
        </header>

        <div className="p-10 max-w-[1700px] mx-auto w-full space-y-10">
          
          {/* TARJETAS DE MÉTRICAS DINÁMICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            
            {/* Estudiantes Activos */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between lg:col-span-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Estudiantes Activos</span>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalEstudiantes}</h3>
                </div>
                <span className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl text-xl">🎓</span>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">vs mes anterior:</span>
                <span className={`font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  stats.estadoMatricula === 'crecio' ? 'bg-emerald-50 text-emerald-600' :
                  stats.estadoMatricula === 'decrecio' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {stats.estadoMatricula === 'crecio' && `📈 Creció (+${stats.crecimientoMatricula})`}
                  {stats.estadoMatricula === 'decrecio' && `📉 Decreció (${stats.crecimientoMatricula})`}
                  {stats.estadoMatricula === 'igual' && `➖ Se mantuvo (${stats.crecimientoMatricula})`}
                </span>
              </div>
            </div>

            {/* Grupos */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Grupos</span>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.totalGrupos}</h3>
              </div>
              <span className="p-4 bg-purple-50 text-purple-600 rounded-2xl text-xl">🏛️</span>
            </div>

            {/* Total Cobrado */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Cobrado</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-2">$ {stats.totalCobrado.toLocaleString('es-MX')}</h3>
              </div>
              <span className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-xl">💳</span>
            </div>

            {/* Saldo Pendiente */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pendiente</span>
                <h3 className="text-2xl font-extrabold text-rose-600 mt-2">$ {stats.totalPendiente.toLocaleString('es-MX')}</h3>
              </div>
              <span className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xl">⚠️</span>
            </div>

            {/* Bajas del Mes */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bajas del Mes</span>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{stats.bajasMes}</h3>
              </div>
              <span className="p-4 bg-amber-50 text-amber-600 rounded-2xl text-xl">🔻</span>
            </div>

          </div>

          {/* SEGUNDA FILA: TASA DE OCUPACIÓN Y HOY EN LA ACADEMIA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* TASA DE OCUPACIÓN */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <h3 className="text-base font-bold text-slate-900">Tasa de Ocupación Académica</h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 font-semibold">Alumnos cursando programa:</span>
                  <span className="font-bold text-slate-900 text-base">{stats.alumnosConCursoActivo} / {stats.totalEstudiantes}</span>
                </div>
                <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.tasaOcupacion, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-500 font-medium">Eficiencia de ocupación:</span>
                  <span className="font-extrabold text-indigo-600 text-base">{stats.tasaOcupacion}%</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mide cuántos de tus estudiantes totales se encuentran activos cursando algún programa o grupo en este momento.
              </p>
            </div>

            {/* HOY EN LA ACADEMIA */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-5 lg:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">📅 Hoy en la Academia</h3>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full capitalize">{fechaActualTexto}</span>
              </div>

              {loading ? (
                <div className="text-center py-10 text-sm text-slate-400">Cargando actividades del día...</div>
              ) : clasesHoy.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No hay clases o sesiones programadas para el día de hoy.
                </div>
              ) : (
                <div className="space-y-4 max-h-[250px] overflow-y-auto">
                  {clasesHoy.map((sesion) => {
                    const nombreCurso = sesion.grupos?.cursos?.Nombre_curso || sesion.grupos?.cursos?.nombre_curso || 'Curso Académico'
                    const nombreGrupo = sesion.grupos?.nombre_grupo || 'Grupo'
                    const modalidad = sesion.grupos?.tipo_modalidad || 'en_linea'
                    const horaSesion = new Date(sesion.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

                    return (
                      <div key={sesion.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 uppercase">Sesión {sesion.numero_sesion}: {sesion.titulo_sesion}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              modalidad === 'presencial' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {modalidad === 'presencial' ? '📍 Presencial' : '💻 En Línea'}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-900">{nombreCurso} • <span className="text-slate-600 font-medium">{nombreGrupo}</span></h4>
                          <p className="text-xs text-slate-500">🕒 Hora: {horaSesion} hrs {modalidad === 'presencial' ? `• Salón: ${sesion.enlace_meet || 'Principal'}` : ''}</p>
                        </div>
                        <span className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xs">Programada</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>

          {/* TERCERA FILA: CUOTAS PENDIENTES */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Cuotas Pendientes y Vencidas</h3>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3.5 py-1.5 rounded-full">En tiempo real</span>
            </div>

            {loading ? (
              <div className="text-center py-14 text-sm text-slate-400">Sincronizando datos de pagos...</div>
            ) : pagosPendientes.length === 0 ? (
              <div className="text-center py-14 text-sm text-slate-400">🎉 ¡Excelente! No hay pagos pendientes en este momento.</div>
            ) : (
              <div className="space-y-4">
                {pagosPendientes.map((p, idx) => {
                  const montoCuota = Number(p.monto || p.Monto || p.cantidad || 0)
                  const fechaVence = p.fecha_vencimiento || p.Fecha_vencimiento || p.vencimiento || 'Sin fecha'

                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-900">Cuota #{p.id}</span>
                          <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono">Alumno ID: {p.alumno_id || p.Alumno_id || p.alumnos_id}</span>
                        </div>
                        <p className="text-xs text-slate-500">Vence: {fechaVence}</p>
                      </div>
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-sm font-extrabold text-rose-600">$ {montoCuota.toLocaleString('es-MX')} MXN</span>
                        <a 
                          href={`/admin/estudiantes/detalle?id=${p.alumno_id || p.Alumno_id || p.alumnos_id || ''}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                        >
                          Revisar
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>

    </div>
  )
}
