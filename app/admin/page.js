'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    totalGrupos: 0,
    totalCursos: 0,
    totalCobrado: 0,
    totalPendiente: 0
  })
  const [pagosPendientes, setPagosPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarMetricasReales()
  }, [])

  const cargarMetricasReales = async () => {
    setLoading(true)

    const { count: countAlumnos } = await supabase
      .from('alumnos')
      .select('*', { count: 'exact', head: true })

    const { count: countGrupos } = await supabase
      .from('grupos')
      .select('*', { count: 'exact', head: true })

    const { count: countCursos } = await supabase
      .from('cursos')
      .select('*', { count: 'exact', head: true })

    const { data: dataPagos } = await supabase
      .from('pagos')
      .select(`
        id,
        monto,
        fecha_vencimiento,
        estatus,
        alumnos (nombre, matricula),
        grupos (nombre_grupo, cursos (Nombre_curso, nombre_curso))
      `)
      .order('fecha_vencimiento', { ascending: true })

    let cobrado = 0
    let pendiente = 0
    let pendientesLista = []

    if (dataPagos) {
      dataPagos.forEach(p => {
        const monto = Number(p.monto) || 0
        if (p.estatus === 'Pagado') {
          cobrado += monto
        } else {
          pendiente += monto
          pendientesLista.push(p)
        }
      })
    }

    setStats({
      totalEstudiantes: countAlumnos || 0,
      totalGrupos: countGrupos || 0,
      totalCursos: countCursos || 0,
      totalCobrado: cobrado,
      totalPendiente: pendiente
    })

    setPagosPendientes(pendientesLista.slice(0, 5))
    setLoading(false)
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
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">Panel General de la Academia</span>
          </div>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">Academia Espiritistas a Cantar</span>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Estudiantes Activos</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalEstudiantes}</h3>
              </div>
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl text-lg">🎓</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Grupos / Horarios</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalGrupos}</h3>
              </div>
              <span className="p-3 bg-purple-50 text-purple-600 rounded-2xl text-lg">🏛️</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Cobrado</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">$ {stats.totalCobrado.toLocaleString('es-MX')}</h3>
              </div>
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-lg">💳</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Saldo Pendiente</span>
                <h3 className="text-2xl font-extrabold text-rose-600 mt-1">$ {stats.totalPendiente.toLocaleString('es-MX')}</h3>
              </div>
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-lg">⚠️</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 lg:col-span-1">
              <h3 className="text-sm font-bold text-slate-900">Acciones Rápidas</h3>
              <div className="space-y-3">
                <a href="/admin/estudiantes" className="p-3.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl border border-slate-100 flex items-center justify-between transition group">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-white rounded-xl shadow-xs text-indigo-600">👤</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">Gestionar Estudiantes</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-indigo-600">→</span>
                </a>

                <a href="/admin/cursos" className="p-3.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl border border-slate-100 flex items-center justify-between transition group">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-white rounded-xl shadow-xs text-indigo-600">📚</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">Catálogo de Cursos</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-indigo-600">→</span>
                </a>

                <a href="/admin/grupos" className="p-3.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl border border-slate-100 flex items-center justify-between transition group">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-white rounded-xl shadow-xs text-indigo-600">🏛️</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">Administrar Grupos</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-indigo-600">→</span>
                </a>

                <a href="/admin/inscripciones" className="p-3.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl border border-slate-100 flex items-center justify-between transition group">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-white rounded-xl shadow-xs text-indigo-600">📋</span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">Ver Inscripciones</span>
                  </div>
                  <span className="text-slate-400 group-hover:text-indigo-600">→</span>
                </a>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900">Cuotas Pendientes y Vencidas en Supabase</h3>
                <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">En tiempo real</span>
              </div>

              {loading ? (
                <div className="text-center py-12 text-xs text-slate-400">Sincronizando datos de pagos...</div>
              ) : pagosPendientes.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">🎉 ¡Excelente! No hay pagos pendientes en este momento.</div>
              ) : (
                <div className="space-y-3">
                  {pagosPendientes.map((p, idx) => {
                    const nombreEstudiante = p.alumnos?.nombre || 'Estudiante'
                    const matricula = p.alumnos?.matricula || 'EAC'
                    const cursoNombre = p.grupos?.cursos?.Nombre_curso || p.grupos?.cursos?.nombre_curso || 'Curso'
                    const grupoNombre = p.grupos?.nombre_grupo || 'Grupo'

                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{nombreEstudiante}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">#{matricula}</span>
                          </div>
                          <p className="text-[11px] text-slate-500">{cursoNombre} — {grupoNombre} (Vence: {p.fecha_vencimiento})</p>
                        </div>
                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <span className="text-xs font-extrabold text-rose-600">$ {Number(p.monto).toLocaleString('es-MX')} MXN</span>
                          <a 
                            href={`/admin/estudiantes/detalle?id=${p.alumnos?.matricula || ''}`}
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
        </div>
      </main>
    </div>
  )
}
