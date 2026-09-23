'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CursosAdminPage() {
  const [cursos, setCursos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [modalCurso, setModalCurso] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Formulario Nuevo Curso
  const [formCurso, setFormCurso] = useState({
    Nombre_curso: '',
    descripcion: ''
  })

  // Formulario Editar Curso
  const [formEdicion, setFormEdicion] = useState({
    Nombre_curso: '',
    descripcion: ''
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const { data: resCursos } = await supabase.from('cursos').select('*').order('id', { ascending: false })
    const { data: resGrupos } = await supabase.from('grupos').select('*, cursos(Nombre_curso, nombre_curso)')

    if (resCursos) setCursos(resCursos)
    if (resGrupos) setGrupos(resGrupos)
    setLoading(false)
  }

  const crearCurso = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('cursos').insert([
      {
        Nombre_curso: formCurso.Nombre_curso.trim(),
        descripcion: formCurso.descripcion.trim()
      }
    ])

    if (error) {
      alert('Error al crear curso: ' + error.message)
    } else {
      setModalCurso(false)
      setFormCurso({ Nombre_curso: '', descripcion: '' })
      cargarDatos()
      alert('¡Curso creado exitosamente!')
    }
    setGuardando(false)
  }

  const guardarEdicionCurso = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase
      .from('cursos')
      .update({
        Nombre_curso: formEdicion.Nombre_curso.trim(),
        descripcion: formEdicion.descripcion.trim()
      })
      .eq('id', cursoSeleccionado.id)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      alert('¡Curso actualizado exitosamente!')
      setModalDetalle(false)
      cargarDatos()
    }
    setGuardando(false)
  }

  const abrirDetalleCurso = (curso) => {
    setCursoSeleccionado(curso)
    setFormEdicion({
      Nombre_curso: curso.Nombre_curso || curso.nombre_curso || '',
      descripcion: curso.descripcion || ''
    })
    setModalDetalle(true)
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
          <a href="/admin" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Gestión de Cursos y Programas</h2>
          <div className="flex items-center gap-3">
            <a href="/admin/grupos" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition">
              Ver Grupos →
            </a>
            <button 
              onClick={() => setModalCurso(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              + Nuevo Curso
            </button>
          </div>
        </header>

        {/* VISTA GENERAL */}
        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* KPI Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Cursos</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{cursos.length}</h3>
              </div>
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl text-lg">📚</span>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Grupos Activos</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{grupos.length}</h3>
              </div>
              <span className="p-3 bg-purple-50 text-purple-600 rounded-2xl text-lg">🏛️</span>
            </div>
          </div>

          {/* LISTADO DE CURSOS */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Catálogo de Cursos (Haz clic para ver y editar)</h3>
            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400">Cargando cursos...</div>
            ) : cursos.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No hay cursos registrados. Haz clic en "+ Nuevo Curso" para empezar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cursos.map((c) => {
                  const nombreCurso = c.Nombre_curso || c.nombre_curso || 'Curso sin nombre'
                  const gruposDelCurso = grupos.filter(g => g.curso_id === c.id)

                  return (
                    <div 
                      key={c.id} 
                      onClick={() => abrirDetalleCurso(c)}
                      className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition hover:shadow-md"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-bold text-slate-900">{nombreCurso}</h4>
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full">
                            {gruposDelCurso.length} grupo{gruposDelCurso.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">{c.descripcion || 'Sin descripción detallada.'}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-indigo-600 font-semibold">
                        <span>Gestionar información →</span>
                        <span className="text-slate-400 text-[10px]">ID: #{c.id}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL NUEVO CURSO */}
      {modalCurso && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Crear Nuevo Curso</h3>
              <p className="text-xs text-slate-400 mt-0.5">Define el programa académico general de la academia.</p>
            </div>
            <form onSubmit={crearCurso} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Curso *</label>
                <input 
                  type="text" 
                  required
                  value={formCurso.Nombre_curso}
                  onChange={(e) => setFormCurso({ ...formCurso, Nombre_curso: e.target.value })}
                  placeholder="Ej. Canto y Espiritualidad"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Descripción</label>
                <textarea 
                  rows="3"
                  value={formCurso.descripcion}
                  onChange={(e) => setFormCurso({ ...formCurso, descripcion: e.target.value })}
                  placeholder="Breve descripción del programa..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600 resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalCurso(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">
                  {guardando ? 'Guardando...' : 'Crear Curso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE / EDITAR CURSO */}
      {modalDetalle && cursoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Detalles y Edición de Curso</h3>
              <p className="text-xs text-slate-400 mt-0.5">Modifica la información general de este programa académico.</p>
            </div>
            
            <form onSubmit={guardarEdicionCurso} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Curso *</label>
                <input 
                  type="text" 
                  required
                  value={formEdicion.Nombre_curso}
                  onChange={(e) => setFormEdicion({ ...formEdicion, Nombre_curso: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Descripción</label>
                <textarea 
                  rows="4"
                  value={formEdicion.descripcion}
                  onChange={(e) => setFormEdicion({ ...formEdicion, descripcion: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalDetalle(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cerrar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm">
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
