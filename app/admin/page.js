'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ estudiantes: 0, cursos: 0, ingresos: 0 })

  useEffect(() => {
    const sesion = localStorage.getItem('eac_sesion')
    if (!sesion || JSON.parse(sesion).rol !== 'admin') {
      window.location.href = '/'
      return
    }
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const { data: alumnos } = await supabase.from('alumnos').select('*')
    const { data: cursos } = await supabase.from('cursos').select('*')
    setStats({
      estudiantes: alumnos ? alumnos.length : 0,
      cursos: cursos ? cursos.length : 0,
      ingresos: 0
    })
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100 font-sans">
      <aside className="w-64 bg-[#0f172a] text-slate-300 hidden md:flex flex-col border-r border-slate-800/60">
        <div className="h-16 px-6 flex items-center border-b border-slate-800/60">
          <span className="font-bold text-white text-sm">Espiritistas a Cantar</span>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1.5 text-sm">
          <a href="/admin" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-indigo-600 text-white font-semibold">📊 Dashboard</a>
          <a href="/admin/estudiantes" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white">🎓 Estudiantes</a>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Panel Directivo</h1>
        </header>
        <div className="p-8 max-w-[1400px] mx-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase">Estudiantes Activos</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.estudiantes}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <p className="text-xs text-slate-400 font-bold uppercase">Cursos Operando</p>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.cursos}</h3>
          </div>
        </div>
      </main>
    </div>
  )
}
