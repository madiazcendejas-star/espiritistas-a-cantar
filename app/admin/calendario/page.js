'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CalendarioAdminPage() {
  const [clases, setClases] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalNuevo, setModalNuevo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario para nueva clase en el calendario
  const [formClase, setFormClase] = useState({
    nombre: '',
    grupo: '',
    fecha: '',
    hora: '',
    instructor: ''
  })

  useEffect(() => {
    cargarCalendarioClases()
  }, [])

  const cargarCalendarioClases = async () => {
    setLoading(true)
    // Asumiendo que tu tabla en Supabase se llama 'horarios_clases' o 'calendario_clases'
    const { data, error } = await supabase
      .from('horarios_clases')
      .select('*')
      .order('fecha', { ascending: true })

    if (!error && data) {
      setClases(data)
    }
    setLoading(false)
  }

  const registrarClase = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('horarios_clases').insert([
      {
        nombre: formClase.nombre.trim(),
        grupo: formClase.grupo.trim(),
        fecha: formClase.fecha,
        hora: formClase.hora,
        instructor: formClase.instructor.trim()
      }
    ])

    if (error) {
      alert('Error al programar la clase: ' + error.message)
    } else {
      setModalNuevo(false)
      setFormClase({ nombre: '', grupo: '', fecha: '', hora: '', instructor: '' })
      cargarCalendarioClases()
      alert('¡Clase programada exitosamente en el calendario!')
    }
    setGuardando(false)
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900 text-sm">
      
      {/* SIDEBAR ADMINISTRATIVO */}
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

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto text-sm font-medium">
          <div className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/calendario" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold shadow-sm">📅 Calendario</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
          
          <div className="pt-6 px-3 pb-2 text-xs uppercase tracking-wider text-indigo-400 font-bold">Presencial</div>
          <a href="/admin/tandas" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📍 Tandas y Misas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* HEADER SUPERIOR */}
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Calendario y Programa de Clases</h1>
            <p className="text-xs text-slate-500">Visualiza la programación de entrenamientos, materias y grupos</p>
          </div>
          <button 
            onClick={() => setModalNuevo(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-bold shadow-sm transition flex items-center gap-2"
          >
            <span>➕</span> Programar Clase
          </button>
        </header>

        {/* CONTENIDO DE CALENDARIO */}
        <div className="p-10 max-w-[1700px] mx-auto w-full space-y-8">
          
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Próximas Clases y Eventos Programados</h3>
              <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-3 py-1.5 rounded-xl">Vista en Tiempo Real</span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sm text-slate-400">Cargando programación del calendario...</div>
            ) : clases.length === 0 ? (
              <div className="text-center py-16 text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No hay clases programadas en el calendario actualmente. ¡Haz clic en "Programar Clase" para agregar una!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {clases.map((c, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:shadow-md transition">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase tracking-wider bg-purple-50 text-purple-700 font-extrabold px-2.5 py-1 rounded-lg">
                          Grupo: {c.grupo || 'General'}
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo-600">{c.fecha || 'Sin fecha'}</span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 mt-2">{c.nombre || c.curso || 'Clase Académica'}</h4>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-200/60 flex justify-between items-center text-xs text-slate-600">
                      <span>⏰ <strong>{c.hora || 'Por definir'}</strong></span>
                      <span>👤 {c.instructor || 'Academia'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL PROGRAMAR NUEVA CLASE */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Programar Nueva Clase</h3>
              <p className="text-xs text-slate-500 mt-1">Ingresa los detalles para que aparezca en el calendario de la academia.</p>
            </div>

            <form onSubmit={registrarClase} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Nombre de la Clase / Programa *</label>
                <input 
                  type="text" 
                  required
                  value={formClase.nombre}
                  onChange={(e) => setFormClase({ ...formClase, nombre: e.target.value })}
                  placeholder="Ej. Entrenamiento Bóveda - Clase 2"
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Grupo *</label>
                  <input 
                    type="text" 
                    required
                    value={formClase.grupo}
                    onChange={(e) => setFormClase({ ...formClase, grupo: e.target.value })}
                    placeholder="Ej. Grupo 6"
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Hora *</label>
                  <input 
                    type="text" 
                    required
                    value={formClase.hora}
                    onChange={(e) => setFormClase({ ...formClase, hora: e.target.value })}
                    placeholder="Ej. 9:00 PM"
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Fecha *</label>
                  <input 
                    type="date" 
                    required
                    value={formClase.fecha}
                    onChange={(e) => setFormClase({ ...formClase, fecha: e.target.value })}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1.5">Instructor / Guía</label>
                  <input 
                    type="text" 
                    value={formClase.instructor}
                    onChange={(e) => setFormClase({ ...formClase, instructor: e.target.value })}
                    placeholder="Nombre del instructor"
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm bg-slate-50 outline-none focus:border-indigo-600 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setModalNuevo(false)} className="px-5 py-2.5 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-semibold transition shadow-sm disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Guardar en Calendario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
