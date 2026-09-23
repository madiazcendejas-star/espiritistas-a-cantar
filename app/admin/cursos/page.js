'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CursosAdminPage() {
  const [cursos, setCursos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading] = useState(true)

  // Modales
  const [modalCurso, setModalCurso] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Formulario Nuevo Curso
  const [formCurso, setFormCurso] = useState({ Nombre_curso: '', descripcion: '' })
  // Formulario Editar Curso
  const [formEdicion, setFormEdicion] = useState({ Nombre_curso: '', descripcion: '' })

  // Formulario Nuevo Recurso / Material
  const [formRecurso, setFormRecurso] = useState({ titulo: '', tipo: 'video', url: '' })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const { data: resCursos } = await supabase.from('cursos').select('*').order('id', { ascending: false })
    const { data: resGrupos } = await supabase.from('grupos').select('*')
    const { data: resRecursos } = await supabase.from('recursos').select('*')

    if (resCursos) setCursos(resCursos)
    if (resGrupos) setGrupos(resGrupos)
    if (resRecursos) setRecursos(resRecursos)
    setLoading(false)
  }

  const crearCurso = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('cursos').insert([{
      Nombre_curso: formCurso.Nombre_curso.trim(),
      descripcion: formCurso.descripcion.trim()
    }])

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

  const agregarRecurso = async (e) => {
    e.preventDefault()
    if (!formRecurso.titulo.trim() || !formRecurso.url.trim()) return

    const { error } = await supabase.from('recursos').insert([{
      curso_id: cursoSeleccionado.id,
      titulo: formRecurso.titulo.trim(),
      tipo: formRecurso.tipo,
      url: formRecurso.url.trim()
    }])

    if (error) {
      alert('Error al agregar recurso: ' + error.message)
    } else {
      setFormRecurso({ titulo: '', tipo: 'video', url: '' })
      cargarDatos()
      alert('¡Material agregado al curso con éxito!')
    }
  }

  const eliminarRecurso = async (idRecurso) => {
    const { error } = await supabase.from('recursos').delete().eq('id', idRecurso)
    if (!error) cargarDatos()
  }

  const eliminarCurso = async () => {
    if (!cursoSeleccionado) return
    if (!confirm('¿Estás seguro de eliminar este curso? Esta acción es irreversible.')) return

    const { error } = await supabase.from('cursos').delete().eq('id', cursoSeleccionado.id)
    if (!error) {
      setModalDetalle(false)
      setCursoSeleccionado(null)
      cargarDatos()
      alert('Curso eliminado.')
    }
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
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Gestión de Cursos y Contenidos LMS</h2>
          <button onClick={() => setModalCurso(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition">
            + Nuevo Curso
          </button>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cursos.map((c) => {
              const nombreCurso = c.Nombre_curso || c.nombre_curso || 'Curso sin nombre'
              const gruposDelCurso = grupos.filter(g => Number(g.curso_id) === Number(c.id))
              const recursosCurso = recursos.filter(r => Number(r.curso_id) === Number(c.id))

              return (
                <div 
                  key={c.id} 
                  onClick={() => abrirDetalleCurso(c)}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-bold text-slate-900">{nombreCurso}</h4>
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">
                        {recursosCurso.length} material(es)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{c.descripcion || 'Sin descripción.'}</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 text-xs text-indigo-600 font-semibold flex justify-between">
                    <span>Administrar contenido →</span>
                    <span>{gruposDelCurso.length} grupo(s)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* MODAL NUEVO CURSO */}
      {modalCurso && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <h3 className="text-base font-bold text-slate-900">Crear Nuevo Curso</h3>
            <form onSubmit={crearCurso} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Curso *</label>
                <input 
                  type="text" 
                  required
                  value={formCurso.Nombre_curso}
                  onChange={(e) => setFormCurso({ ...formCurso, Nombre_curso: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Descripción</label>
                <textarea 
                  rows="3"
                  value={formCurso.descripcion}
                  onChange={(e) => setFormCurso({ ...formCurso, descripcion: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalCurso(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE, EDICIÓN Y SUBIDA DE RECURSOS */}
      {modalDetalle && cursoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gestión del Curso y Materiales</h3>
                <p className="text-xs text-slate-400">Actualiza la información y sube recursos para el estudiante.</p>
              </div>
              <button onClick={eliminarCurso} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-xs font-semibold">Eliminar Curso</button>
            </div>
            
            <form onSubmit={guardarEdicionCurso} className="space-y-4 border-b border-slate-100 pb-6">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Curso</label>
                <input 
                  type="text" 
                  required
                  value={formEdicion.Nombre_curso}
                  onChange={(e) => setFormEdicion({ ...formEdicion, Nombre_curso: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Descripción</label>
                <textarea 
                  rows="3"
                  value={formEdicion.descripcion}
                  onChange={(e) => setFormEdicion({ ...formEdicion, descripcion: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none resize-none"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Guardar Cambios</button>
              </div>
            </form>

            {/* SECCIÓN DE RECURSOS Y MATERIALES */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subir Clase Grabada o PDF</h4>
              <form onSubmit={agregarRecurso} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  required
                  placeholder="Título (Ej. Clase 1 - Grabación)"
                  value={formRecurso.titulo}
                  onChange={(e) => setFormRecurso({ ...formRecurso, titulo: e.target.value })}
                  className="p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                />
                <select 
                  value={formRecurso.tipo}
                  onChange={(e) => setFormRecurso({ ...formRecurso, tipo: e.target.value })}
                  className="p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                >
                  <option value="video">Video / Clase</option>
                  <option value="pdf">Documento PDF</option>
                </select>
                <input 
                  type="url" 
                  required
                  placeholder="URL (Enlace de YouTube, Drive...)"
                  value={formRecurso.url}
                  onChange={(e) => setFormRecurso({ ...formRecurso, url: e.target.value })}
                  className="p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                />
                <button type="submit" className="sm:col-span-3 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold">
                  + Agregar Material al Curso
                </button>
              </form>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Materiales existentes:</span>
                {recursos.filter(r => Number(r.curso_id) === Number(cursoSeleccionado.id)).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay recursos subidos aún.</p>
                ) : (
                  recursos.filter(r => Number(r.curso_id) === Number(cursoSeleccionado.id)).map(rec => (
                    <div key={rec.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{rec.titulo}</span>
                        <span className="text-[10px] text-indigo-600 block uppercase">{rec.tipo}</span>
                      </div>
                      <button onClick={() => eliminarRecurso(rec.id)} className="text-rose-600 font-bold hover:underline">Eliminar</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModalDetalle(false)} className="px-5 py-2 text-xs font-semibold bg-slate-100 rounded-xl">Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
