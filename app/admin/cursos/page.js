'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CursosPage() {
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario nuevo curso
  const [nuevoCurso, setNuevoCurso] = useState({
    nombre: '',
    descripcion: '',
    costo: ''
  })

  useEffect(() => {
    // Validar sesión de administrador
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

  const registrarCurso = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('cursos').insert([
      {
        nombre: nuevoCurso.nombre.trim(),
        descripcion: nuevoCurso.descripcion.trim(),
        costo: parseFloat(nuevoCurso.costo) || 0
      }
    ])

    if (error) {
      alert('Error al registrar programa académico: ' + error.message)
    } else {
      setModalAbierto(false)
      setNuevoCurso({ nombre: '', descripcion: '', costo: '' })
      cargarCursos()
    }
    setGuardando(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100 font-sans">
      
      {/* SIDEBAR INSTITUCIONAL */}
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
          
          <a href="/admin" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>📊</span> Dashboard
          </a>
          <a href="/admin/estudiantes" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>🎓</span> Estudiantes
          </a>
          <a href="/admin/cursos" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-indigo-600 text-white font-semibold transition">
            <span>📚</span> Programas / Cursos
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

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative w-full">
        
        {/* Header Superior */}
        <header className="bg-white border-b border-slate-200/80 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Programas y Cursos Académicos</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-900">Control Escolar</span>
              <span className="block text-[10px] text-indigo-600 font-semibold">Oferta Educativa</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">A</div>
          </div>
        </header>

        {/* Contenedor de la Vista */}
        <div className="p-8 max-w-[1400px] mx-auto w-full space-y-6">
          
          {/* Barra de Acciones */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Gestione los planes de estudio y costos vigentes de la academia.</p>
            <button 
              onClick={() => setModalAbierto(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <span>+</span> Nuevo Programa
            </button>
          </div>

          {/* Listado de Cursos en Tarjetas Grid */}
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Cargando programas académicos...</div>
          ) : cursos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-3xl border border-slate-200">No hay cursos registrados en el sistema.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map((c) => (
                <div key={c.id} className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-wider">Activo</span>
                      <span className="text-sm font-extrabold text-slate-900">${c.costo ? c.costo.toFixed(2) : '0.00'}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{c.nombre}</h3>
                    <p className="text-xs text-slate-500 line-clamp-3">{c.descripcion || 'Sin descripción detallada.'}</p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>ID del Programa: #{c.id}</span>
                    <span className="text-indigo-600 font-semibold cursor-pointer hover:underline" onClick={() => alert(`Detalles del curso: ${c.nombre}`)}>Ver detalles</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* MODAL NUEVO CURSO */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Registrar Nuevo Curso</h3>
            <p className="text-xs text-slate-400 mb-6">Añada un programa académico a la oferta educativa.</p>

            <form onSubmit={registrarCurso} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Curso *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoCurso.nombre}
                  onChange={(e) => setNuevoCurso({ ...nuevoCurso, nombre: e.target.value })}
                  placeholder="Ej. Canto y Espiritualidad Avanzada"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Descripción</label>
                <textarea 
                  rows="3"
                  value={nuevoCurso.descripcion}
                  onChange={(e) => setNuevoCurso({ ...nuevoCurso, descripcion: e.target.value })}
                  placeholder="Breve resumen del contenido programático..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Costo ($ MXN) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={nuevoCurso.costo}
                  onChange={(e) => setNuevoCurso({ ...nuevoCurso, costo: e.target.value })}
                  placeholder="Ej. 1500.00"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear Programa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
