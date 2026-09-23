'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function AlumnoPortalPage() {
  const [alumno, setAlumno] = useState(null)
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validar sesión de alumno almacenada en localStorage
    const sesion = localStorage.getItem('eac_sesion')
    if (!sesion) {
      window.location.href = '/'
      return
    }
    const datos = JSON.parse(sesion)
    if (datos.rol !== 'alumno') {
      window.location.href = '/'
      return
    }
    setAlumno(datos.alumno)
    cargarCursos()
  }, [])

  const cargarCursos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cursos')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setCursos(data)
    }
    setLoading(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

  if (!alumno) return null

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Header del Alumno */}
      <header className="bg-[#0f172a] text-white border-b border-slate-800 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">EC</div>
          <span className="font-bold text-sm tracking-tight">Espiritistas a Cantar | Portal del Estudiante</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-300 font-medium hidden sm:block">Hola, <strong className="text-white">{alumno.nombre}</strong></span>
          <button 
            onClick={cerrarSesion}
            className="bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-6 md:p-10 space-y-8">
        
        {/* Banner de Bienvenida */}
        <div className="bg-indigo-600 text-white rounded-3xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="z-10">
            <span className="px-3 py-1 bg-indigo-500/50 text-indigo-100 rounded-full text-[10px] font-bold uppercase tracking-wider">Alumno Activo</span>
            <h1 className="text-2xl font-bold mt-2">Bienvenido a su plataforma LMS</h1>
            <p className="text-indigo-100 text-xs mt-1">Consulte sus programas académicos y material de estudio asignado.</p>
          </div>
          <div className="bg-indigo-700/60 backdrop-blur-sm p-4 rounded-2xl border border-indigo-500/40 z-10 text-xs space-y-1">
            <p><span className="text-indigo-200">Usuario / Teléfono:</span> {alumno.telefono}</p>
            <p><span className="text-indigo-200">Correo:</span> {alumno.correo || 'No registrado'}</p>
          </div>
        </div>

        {/* Listado de Cursos Disponibles */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 tracking-tight">Programas Académicos Disponibles</h2>
          
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando programas académicos...</div>
          ) : cursos.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center text-slate-400 text-xs border border-slate-200">No hay programas académicos disponibles en este momento.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cursos.map((c) => (
                <div key={c.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Disponible</span>
                      <span className="text-xs font-bold text-slate-500">Inscrito</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{c.nombre}</h3>
                    <p className="text-xs text-slate-500 line-clamp-3 mb-4">{c.descripcion || 'Sin descripción detallada para este programa.'}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">Modalidad En Línea</span>
                    <button 
                      onClick={() => alert(`Accediendo al material de: ${c.nombre}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
                    >
                      Entrar al Curso
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Espiritistas a Cantar. Excelencia y Disciplina Académica.</p>
      </footer>
    </div>
  )
}
