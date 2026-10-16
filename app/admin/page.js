'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    crecimientoMatricula: 0, // Porcentaje o diferencia vs mes anterior
    estadoMatricula: 'igual', // 'crecio' | 'decrecio' | 'igual'
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

  // Fecha actual formateada para el subtítulo
  const fechaActualTexto = new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  useEffect(() => {
    cargarMetricasDelMes()
  }, [])

  const cargarMetricasDelMes = async () => {
    setLoading(true)

    try {
      // Definir inicio y fin del mes actual
      const ahora = new Date()
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
      const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59).toISOString()

      // Mes anterior para comparar matrícula
      const primerDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()
      const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59).toISOString()

      // 1. Estudiantes Activos totales y del mes anterior para la tendencia
      const { count: countAlumnos } = await supabase
        .from('alumnos')
        .select('*', { count: 'exact', head: true })

      // Alumnos registrados hasta el mes pasado (para comparar crecimiento)
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

      // 2. Contar grupos
      const { count: countGrupos } = await supabase
        .from('grupos')
        .select('*', { count: 'exact', head: true })

      // 3. Bajas del mes (asumiendo campo 'estatus' o 'fecha_baja' en alumnos o inscripciones)
      const { count: countBajas } = await supabase
        .from('alumnos')
        .select('*', { count: 'exact', head: true })
        .eq('estatus', 'Baja')
        .gte('updated_at', primerDiaMes)
        .lte('updated_at', ultimoDiaMes)

      // 4. Alumnos tomando un curso ahorita (ej. inscripciones activas)
      const { data: inscripcionesActivas } = await supabase
        .from('inscripciones')
        .select('alumno_id')
        .eq('estatus', 'Activo')

      // Contar alumnos únicos tomando curso
      const alumnosUnicosConCurso = new Set(inscripcionesActivas?.map(i => i.alumno_id) || []).size
      const tasaOcupacionCalc = totalActual > 0 ? Math.round((alumnosUnicosConCurso / totalActual) * 100) : 0

      // 5. Pagos filtrados del mes actual (1er día al último día)
      const { data: dataPagos, error: errPagos } = await supabase
        .from('pagos')
        .select('*')
        .gte('created_at', primerDiaMes)
        .lte('created_at', ultimoDiaMes)

      let cobrado = 0
      let pendiente = 0
      let pendientesLista = []

      if (!errPagos && dataPagos) {
        dataPagos.forEach(p => {
          const monto = Number(p.monto || p.Monto || 0)
          const estatus = p.estatus || p.Estatus || p.estado || p.Estado || 'Pendiente'

          if (estatus === 'Pagado') {
            cobrado += monto
          } else {
            pendiente += monto
            pendientesLista.push(p)
          }
        })
      }

      // 6. Hoy en la academia (Clases del día de hoy)
      // Ajusta 'clases' o 'horarios' según el nombre de tu tabla en Supabase
      const diaSemanaHoy = ahora.toLocaleDateString('es-MX', { weekday: 'long' }).toLowerCase()
      const { data: dataClases } = await supabase
        .from('horarios_clases') // Cambiar por tu tabla real de clases/horarios si difiere
        .select('*')
        .ilike('dia', `%${diaSemanaHoy}%`)

      setStats({
        totalEstudiantes: totalActual,
        crecimientoMatricula: diferenciaMatricula,
        estadoMatricula: tendencia,
        totalGrupos: countGrupos || 0,
        totalCobrado: cobrado,
        totalPendiente: pendiente,
        bajasMes: countBajas || 0,
        tasaOcupacion: tasaOcupacionCalc,
        alumnosConCursoActivo: alumnosUnicosConCurso
      })

      setClasesHoy(dataClases || [])
      setPagosPendientes(pendientesLista.slice(0, 5))

    } catch (error) {
      console.error("Error al cargar métricas del mes:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-md">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs leading-tight">Espiritistas a Cantar</span>
              <span className="text-[10px] text-indigo-400 font-medium">Panel Administrativo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto text-xs font-medium">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
          
          <div className="pt-4 px-3 pb-2 text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Presencial</div>
          <a href="/admin/tandas" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-950/80 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-900 transition">📍 Tandas y Misas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div className="flex flex-col">
            <h1 className="text-sm font-extrabold text-slate-900">Inicio</h1>
            <span className="text-[11px] text-slate-500 capitalize">Espiritistas a Cantar • {fechaActualTexto}</span>
          </div>
          
          {/* BOTONES DE ACCIÓN RÁPIDA */}
          <div className="flex items-center gap-3">
            <a href="/admin/estudiantes/nuevo" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2">
              <span>➕</span> Nuevo Alumno
            </a>
            <a href="/admin/inscripciones/nueva" className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2">
              <span>📋</span> Nueva Inscripción
            </a>
          </div>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* TARJETAS DE MÉTRICAS DINÁMICAS (MES EN CURSO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            
            {/* Estudiantes Activos + Gráfica/Tendencia */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between lg:col-span-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Estudiantes Activos</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalEstudiantes}</h3>
                </div>
                <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl text-lg">🎓</span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">vs mes anterior:</span>
                <span className={`font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  stats.estadoMatricula === 'crecio' ? 'bg-emerald-50 text-emerald-600' :
                  stats.estadoMatricula === 'decrecio' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                }`}>
                  {stats.estadoMatricula === 'crecio' && '📈 Creció (+'}
                  {stats.estadoMatricula === 'decrecio' && '📉 Decreció ('}
                  {stats.estadoMatricula === 'igual' && '➖ Se mantuvo (') }
                  {stats.crecimientoMatricula})
                </span>
              </div>
            </div>

            {/* Grupos */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Grupos</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalGrupos}</h3>
              </div>
              <span className="p-3 bg-purple-50 text-purple-600 rounded-2xl text-lg">🏛️</span>
            </div>

            {/* Total Cobrado (Del Mes) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Cobrado (Mes)</span>
                <h3 className="text-xl font-extrabold text-emerald-600 mt-1">$ {stats.totalCobrado.toLocaleString('es-MX')}</h3>
              </div>
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-lg">💳</span>
            </div>

            {/* Saldo Pendiente (Del Mes) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Pendiente (Mes)</span>
                <h3 className="text-xl font-extrabold text-rose-600 mt-1">$ {stats.totalPendiente.toLocaleString('es-MX')}</h3>
              </div>
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-lg">⚠️</span>
            </div>

            {/* Bajas del Mes */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Bajas del Mes</span>
                <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{stats.bajasMes}</h3>
              </div>
              <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl text-lg">🔻</span>
            </div>

          </div>

          {/* SEGUNDA FILA: TASA DE OCUPACIÓN Y HOY EN LA ACADEMIA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* TASA DE OCUPACIÓN */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Tasa de Ocupación Académica</h3>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Alumnos cursando programa:</span>
                  <span className="font-bold text-slate-900">{stats.alumnosConCursoActivo} / {stats.totalEstudiantes}</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(stats.tasaOcupacion, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-xs pt-1">
                  <span className="text-slate-400">Eficiencia de ocupación:</span>
                  <span className="font-extrabold text-indigo-600">{stats.tasaOcupacion}%</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mide cuántos de tus estudiantes totales se encuentran activos cursando algún programa en este momento.
              </p>
            </div>

            {/* HOY EN LA ACADEMIA */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">📅 Hoy en la Academia</h3>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full capitalize">{fechaActualTexto}</span>
              </div>

              {loading ? (
                <div className="text-center py-8 text-xs text-slate-400">Cargando actividades del día...</div>
              ) : clasesHoy.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  No hay clases o eventos programados para el día de hoy.
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto">
                  {clasesHoy.map((clase, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{clase.nombre || clase.curso || 'Clase Programada'}</h4>
                        <p className="text-[11px] text-slate-500">Horario: {clase.horario || clase.hora || 'Por definir'} • Grupo: {clase.grupo || 'General'}</p>
                      </div>
                      <span className="bg-indigo-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-xl">En curso</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* TERCERA FILA: CUOTAS PENDIENTES */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Cuotas Pendientes y Vencidas del Mes</h3>
              <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">En tiempo real</span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400">Sincronizando datos de pagos...</div>
            ) : pagosPendientes.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400">🎉 ¡Excelente! No hay pagos pendientes registrados para este mes.</div>
            ) : (
              <div className="space-y-3">
                {pagosPendientes.map((p, idx) => {
                  const montoCuota = Number(p.monto || p.Monto || 0)
                  const fechaVence = p.fecha_vencimiento || p.Fecha_vencimiento || 'Sin fecha'

                  return (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Cuota #{p.id}</span>
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">Alumno ID: {p.alumno_id || p.Alumno_id}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Vence: {fechaVence}</p>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="text-xs font-extrabold text-rose-600">$ {montoCuota.toLocaleString('es-MX')} MXN</span>
                        <a 
                          href={`/admin/estudiantes/detalle?id=${p.alumno_id || p.Alumno_id || ''}`}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-[10px] font-semibold transition"
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
