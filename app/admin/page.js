'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    estudiantes: 0,
    grupos: 8,
    ingresos: 1459690,
    ocupacion: 85,
    bajas: 0
  })
  const [pagosVencidos, setPagosVencidos] = useState([])
  const [sesionesHoy, setSesionesHoy] = useState([
    { id: 1, sala: 'Sala de 3', horario: '08:00 - 13:30', profesor: 'Florencia Tabárez', estado: 'En curso' },
    { id: 2, sala: 'Sala de 4 · Matutino', horario: '08:00 - 13:30', profesor: 'Paula Gadea', estado: 'Completada' },
    { id: 3, sala: 'Sala de 5 · Matutino', horario: '08:00 - 13:30', profesor: 'Martín Cardozo', estado: 'Completada' }
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sesion = localStorage.getItem('eac_sesion')
    if (!sesion || JSON.parse(sesion).rol !== 'admin') {
      window.location.href = '/'
      return
    }
    cargarDatosDashboard()
  }, [])

  const cargarDatosDashboard = async () => {
    setLoading(true)
    // Cargar alumnos desde Supabase
    const { data: alumnos } = await supabase.from('alumnos').select('*')
    const { data: cursos } = await supabase.from('cursos').select('*')

    setStats({
      estudiantes: alumnos ? alumnos.length : 0,
      grupos: cursos ? cursos.length : 4,
      ingresos: 1459690, // Simulado o conectado a tabla de pagos
      ocupacion: 85,
      bajas: 0
    })

    // Simulación de pagos vencidos conectados al esquema de cobros
    setPagosVencidos([
      { id: '3JYQ3Y', nombre: 'Olivia Arocena', sala: 'Sala de 1 · Matutino', monto: 13702.50, fecha: '15 sep' },
      { id: 'AAN8SH', nombre: 'Felipe Krauss', sala: 'Sala de 3 · Vespertino', monto: 13125.00, fecha: '15 sep' },
      { id: 'BKODID', nombre: 'Guadalupe Fernández', sala: 'Sala de 3 · Matutino', monto: 13125.00, fecha: '15 sep' }
    ])

    setLoading(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR INSTITUCIONAL (Estilo Craqui) */}
      <aside className="w-64 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        
        {/* Selector de Negocio / Academia */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-md">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-xs leading-tight">Espiritistas a Cantar</span>
              <span className="text-[10px] text-indigo-400 font-medium">Panel Administrativo</span>
            </div>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto text-xs font-medium">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          
          <div className="pt-4 px-3 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Operación</div>
          <a href="#calendario" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📅 Calendario</a>
          <a href="#inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📝 Inscripciones</a>
          <a href="#asistencia" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">✅ Asistencia</a>
          <a href="#pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Créditos</a>
        </nav>

        {/* Perfil Inferior */}
        <div className="p-4 border-t border-slate-800/80 flex items-center justify-between bg-[#0f172a]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center font-bold text-xs">AD</div>
            <span className="text-xs text-slate-200 font-medium truncate max-w-[110px]">Administrador</span>
          </div>
          <button onClick={cerrarSesion} className="text-slate-400 hover:text-rose-400 text-xs transition" title="Cerrar sesión">🚪</button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* Barra Superior / Buscador */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4 w-full max-w-md">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar o ejecutar una acción (Ctrl + K)..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-600">Academia Espiritistas a Cantar</span>
          </div>
        </header>

        {/* CONTENIDO DEL DASHBOARD */}
        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* 1. SECCIÓN DE KPI CARDS (5 Tarjetas Superiores) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            
            {/* Estudiantes Activos */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estudiantes activos</span>
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs">👥</span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900">{stats.estudiantes}</h2>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Cursando hoy</span>
                <span className="text-emerald-600 font-semibold">+0% desde último mes</span>
              </div>
            </div>

            {/* Grupos en Curso */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grupos en Curso</span>
                  <span className="p-2 bg-purple-50 text-purple-600 rounded-xl text-xs">📚</span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900">{stats.grupos}</h2>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Repartidos en cursos</span>
                <span className="text-emerald-600 font-semibold">+0% pasado</span>
              </div>
            </div>

            {/* Ingresos del Mes */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ingresos del Mes</span>
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs">💲</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900">$ {stats.ingresos.toLocaleString('es-MX')}</h2>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Facturación</span>
                <span className="text-rose-500 font-semibold">Mes actual</span>
              </div>
            </div>

            {/* Tasa de Ocupación */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Ocupación</span>
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-xs">📊</span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900">{stats.ocupacion}%</h2>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{stats.estudiantes} inscripciones</span>
              </div>
            </div>

            {/* Bajas este mes */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bajas este mes</span>
                  <span className="p-2 bg-rose-50 text-rose-600 rounded-xl text-xs">⚠️</span>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-900">{stats.bajas}</h2>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Tasa de churn: 0%</span>
              </div>
            </div>

          </div>

          {/* 2. SECCIÓN INFERIOR DE 3 COLUMNAS[cite: 5] */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna 1: Acciones Rápidas[cite: 5] */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Acciones Rápidas</h3>
                <p className="text-xs text-slate-400">Accesos directos a funciones principales</p>
              </div>

              <div className="space-y-3 pt-2">
                <a href="/admin/estudiantes" className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 transition group border border-slate-100">
                  <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">👤</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">Nuevo Estudiante</h4>
                    <p className="text-[11px] text-slate-500">Añade un estudiante al sistema</p>
                  </div>
                </a>

                <a href="/admin/estudiantes" className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 transition group border border-slate-100">
                  <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">📝</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">Inscribir Estudiante</h4>
                    <p className="text-[11px] text-slate-500">Inscribe a un alumno a un curso</p>
                  </div>
                </a>

                <a href="/admin/cursos" className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 transition group border border-slate-100">
                  <span className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">📚</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition">Nuevo Curso</h4>
                    <p className="text-[11px] text-slate-500">Crea un nuevo programa académico</p>
                  </div>
                </a>

                <a href="/admin/cursos" className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 transition group border border-slate-100">
                  <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">🏛️</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition">Nuevo Grupo</h4>
                    <p className="text-[11px] text-slate-500">Crea un grupo de estudiantes</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Columna 2: Sesiones de Hoy[cite: 5] */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-base font-bold text-slate-900">Sesiones de Hoy</h3>
                  <span className="text-xs font-semibold text-indigo-600">3</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">martes, 23 septiembre</p>

                <div className="space-y-3">
                  {sesionesHoy.map((s) => (
                    <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-900">{s.sala}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.estado === 'En curso' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {s.estado}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex justify-between">
                        <span>🕒 {s.horario}</span>
                        <span>👨‍🏫 {s.profesor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 text-center">
                <button onClick={() => alert('Módulo de calendario completo')} className="text-xs font-semibold text-indigo-600 hover:underline">
                  Ver calendario completo →
                </button>
              </div>
            </div>

            {/* Columna 3: Recordatorios de Pago[cite: 5] */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Recordatorios de Pago <span className="text-rose-500">⚠️</span>
                  </h3>
                  <span className="text-[10px] bg-rose-50 text-rose-600 font-bold px-2 py-0.5 rounded-full">Vencidos</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">Mostrando pagos pendientes y vencidos</p>

                <div className="space-y-3">
                  {pagosVencidos.map((p, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{p.nombre}</span>
                          <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">{p.id}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{p.sala}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">Vencido</span>
                          <span className="text-[10px] text-slate-400">📅 {p.fecha}</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-xs font-extrabold text-slate-900 block">$ {p.monto.toLocaleString('es-MX')}</span>
                        <button 
                          onClick={() => alert(`Registrar pago para ${p.nombre}`)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-xl text-[10px] font-semibold transition shadow-xs"
                        >
                          Registrar pago
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4 text-center">
                <button onClick={() => alert('Redirigiendo al listado completo de pagos vencidos')} className="text-xs font-semibold text-indigo-600 hover:underline">
                  Ver todos los pagos vencidos →
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

    </div>
  )
}
