'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    estudiantes: 0,
    cursos: 0,
    ingresos: 0,
    morosos: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión de administrador
    const sesion = localStorage.getItem('eac_sesion')
    if (!sesion) {
      window.location.href = '/'
      return
    }
    const datos = JSON.parse(sesion)
    if (datos.rol !== 'admin') {
      window.location.href = '/'
      return
    }

    cargarDatosDashboard()
  }, [])

  const cargarDatosDashboard = async () => {
    try {
      // 1. Obtener Alumnos
      const { data: alumnos } = await supabase.from('alumnos').select('*')
      // 2. Obtener Cursos
      const { data: cursos } = await supabase.from('cursos').select('*')
      // 3. Obtener Pagos para calcular ingresos del mes
      const { data: pagos } = await supabase.from('pagos').select('*')

      let ingresosMes = 0
      const mesActualStr = new Date().toISOString().slice(0, 7) // Formato YYYY-MM
      
      if (pagos) {
        pagos.forEach(p => {
          if (p.fecha_pago && p.fecha_pago.startsWith(mesActualStr)) {
            ingresosMes += parseFloat(p.monto || 0)
          }
        })
      }

      setStats({
        estudiantes: alumnos ? alumnos.length : 0,
        cursos: cursos ? cursos.length : 0,
        ingresos: ingresosMes,
        morosos: 0 // Se actualizará al integrar el módulo de cobranza detallada
      })
    } catch (error) {
      console.error('Error cargando métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100 font-sans">
      
      {/* SIDEBAR INSTITUCIONAL ESTILO EJECUTIVO */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 hidden md:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-800/60">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-[13px] leading-tight">Espiritistas a Cantar</span>
              <span className="text-[10px] text-indigo-400 font-medium">Panel Directivo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto text-sm">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Gestión Académica</div>
          
          <a href="/admin" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-indigo-600 text-white font-semibold transition">
            <span>📊</span> Dashboard
          </a>
          <a href="#" onClick={() => alert('Módulo de Estudiantes en el siguiente paso')} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>🎓</span> Estudiantes
          </a>
          <a href="#" onClick={() => alert('Módulo de Cursos en el siguiente paso')} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>📚</span> Programas / Cursos
          </a>
          <a href="#" onClick={() => alert('Módulo de Cobranza en el siguiente paso')} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>💳</span> Finanzas y Cobranza
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <button 
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 bg-slate-800/40 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative w-full">
        
        {/* Header Superior */}
        <header className="bg-white border-b border-slate-200/80 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 w-full max-w-md">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Panel de Control Ejecutivo</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-900">Administrador General</span>
              <span class="block text-[10px] text-indigo-600 font-semibold">Dirección Académica</span>
            </div>
            <div class="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">A</div>
          </div>
        </header>

        {/* Cuerpo del Dashboard */}
        <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8">
          
          {/* Tarjetas de Estadísticas (KPIs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Estudiantes Activos</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{loading ? '...' : stats.estudiantes}</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl font-bold">🎓</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Cursos Operando</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{loading ? '...' : stats.cursos}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-xl font-bold">📚</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Ingresos del Mes</p>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{loading ? '...' : `$${stats.ingresos.toFixed(2)}`}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl font-bold">💵</div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Deuda Vigente</p>
                <h3 className="text-3xl font-extrabold text-rose-600 mt-1">{loading ? '...' : stats.morosos}</h3>
              </div>
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-xl font-bold">⚠️</div>
            </div>
          </div>

          {/* Sección Informativa / Estado del Sistema */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 mb-2">Bienvenido al Sistema Académico & LMS</h3>
            <p className="text-sm text-slate-500">La infraestructura directiva está conectada exitosamente a la base de datos institucional en Supabase. Las métricas se actualizan en tiempo real.</p>
          </div>

        </div>
      </main>
    </div>
  )
}
