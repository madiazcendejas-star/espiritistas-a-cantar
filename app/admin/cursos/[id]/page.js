'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function DetalleCursoPage() {
  const params = useParams()
  const router = useRouter()
  const cursoId = params.id

  const [curso, setCurso] = useState(null)
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [pestanaActiva, setPestanaActiva] = useState('detalles')

  const [formEdicion, setFormEdicion] = useState({ Nombre_curso: '', descripcion: '', precio: '', foto_url: '', visible_web: true })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (cursoId) cargarCursoYGrupos()
  }, [cursoId])

  const cargarCursoYGrupos = async () => {
    setLoading(true)
    const { data: resCurso } = await supabase.from('cursos').select('*').eq('id', cursoId).single()
    const { data: resGrupos } = await supabase.from('grupos').select('*').eq('curso_id', cursoId)

    if (resCurso) {
      setCurso(resCurso)
      setFormEdicion({
        Nombre_curso: resCurso.Nombre_curso || resCurso.nombre_curso || '',
        descripcion: resCurso.descripcion || '',
        precio: resCurso.precio || '',
        foto_url: resCurso.foto_url || '',
        visible_web: resCurso.visible_web ?? true
      })
    }
    if (resGrupos) setGrupos(resGrupos)
    setLoading(false)
  }

  const guardarCambios = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase
      .from('cursos')
      .update({
        Nombre_curso: formEdicion.Nombre_curso.trim(),
        descripcion: formEdicion.descripcion.trim(),
        precio: Number(formEdicion.precio) || 0,
        foto_url: formEdicion.foto_url.trim(),
        visible_web: formEdicion.visible_web
      })
      .eq('id', cursoId)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      alert('¡Curso actualizado exitosamente!')
      cargarCursoYGrupos()
    }
    setGuardando(false)
  }

  const eliminarCurso = async () => {
    if (!confirm('¿Estás seguro de eliminar este curso? Esta acción es irreversible.')) return

    const { error } = await supabase.from('cursos').delete().eq('id', cursoId)
    if (!error) {
      alert('Curso eliminado.')
      router.push('/admin/cursos')
    } else {
      alert('Error al eliminar: ' + error.message)
    }
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm font-bold">Cargando expediente del curso...</div>
  }

  if (!curso) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm font-bold">Curso no encontrado.</div>
  }

  const nombreCurso = curso.Nombre_curso || curso.nombre_curso || 'Curso sin nombre'

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight">Espiritistas a Cantar</span>
              <span className="text-xs text-indigo-400 font-medium">Panel Administrativo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto text-sm font-medium">
          <div className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/cursos')} 
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{nombreCurso}</h1>
              <p className="text-xs text-slate-500 font-medium">Gestiona los detalles del curso y sus grupos</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl">
              <span className="text-xs font-bold text-slate-700">Visible en la web</span>
              <input 
                type="checkbox" 
                checked={formEdicion.visible_web}
                onChange={(e) => setFormEdicion({ ...formEdicion, visible_web: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-8">
          
          <div className="flex gap-8 border-b border-slate-200 text-sm font-bold">
            <button 
              onClick={() => setPestanaActiva('detalles')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'detalles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              📝 Detalles
            </button>
            <button 
              onClick={() => setPestanaActiva('grupos')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'grupos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              🏛️ Grupos <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">{grupos.length}</span>
            </button>
            <button 
              onClick={() => setPestanaActiva('workshops')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'workshops' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              ⚡ Workshops <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">0</span>
            </button>
            <button 
              onClick={() => setPestanaActiva('imagenes')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'imagenes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              🖼️ Imágenes
            </button>
          </div>

          {pestanaActiva === 'detalles' && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <h3 className="text-base font-extrabold text-slate-900">Información General</h3>
                
                <form onSubmit={guardarCambios} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Título del Curso</label>
                    <input 
                      type="text" 
                      required
                      value={formEdicion.Nombre_curso}
                      onChange={(e) => setFormEdicion({ ...formEdicion, Nombre_curso: e.target.value })}
                      className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Descripción</label>
                    <textarea 
                      rows="4"
                      value={formEdicion.descripcion}
                      onChange={(e) => setFormEdicion({ ...formEdicion, descripcion: e.target.value })}
                      className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none resize-none focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Precio (Desde)</label>
                      <input 
                        type="number"
                        value={formEdicion.precio}
                        onChange={(e) => setFormEdicion({ ...formEdicion, precio: e.target.value })}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">URL de la Miniatura / Foto</label>
                      <input 
                        type="url"
                        value={formEdicion.foto_url}
                        onChange={(e) => setFormEdicion({ ...formEdicion, foto_url: e.target.value })}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 text-xs text-slate-400 font-medium">
                    <div>Fecha de Creación: <span className="text-slate-700 font-bold">{new Date(curso.created_at || Date.now()).toLocaleString()}</span></div>
                    <div>Última Modificación: <span className="text-slate-700 font-bold">{new Date().toLocaleString()}</span></div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={guardando} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/20 transition"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-rose-200/80 shadow-xs space-y-4">
                <h4 className="text-sm font-extrabold text-rose-600">Zona de Peligro</h4>
                <p className="text-xs text-slate-500">Eliminar el curso es una acción irreversible y borrará toda su vinculación.</p>
                <button 
                  onClick={eliminarCurso} 
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-3 rounded-2xl text-xs font-bold transition"
                >
                  Eliminar Curso
                </button>
              </div>
            </div>
          )}

          {pestanaActiva === 'grupos' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900">Grupos Asociados</h3>
                <button 
                  onClick={() => alert('Crear grupo vinculado a este curso')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
                >
                  + Crear Grupo
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse text-sm font-medium">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider">
                      <th className="py-4 px-6">Grupo</th>
                      <th className="py-4 px-6">Curso</th>
                      <th className="py-4 px-6">Horario</th>
                      <th className="py-4 px-6">Ocupación</th>
                      <th className="py-4 px-6">Progreso</th>
                      <th className="py-4 px-6">Costo</th>
                      <th className="py-4 px-6">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grupos.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-10 text-center text-slate-400 italic">No hay grupos ligados a este curso.</td>
                      </tr>
                    ) : (
                      grupos.map(g => (
                        <tr 
                          key={g.id} 
                          onClick={() => alert(`Ir al detalle del grupo: ${g.nombre || g.grupo}`)}
                          className="hover:bg-slate-50 cursor-pointer transition"
                        >
                          <td className="py-4 px-6 font-bold text-slate-900">{g.nombre || g.grupo || 'Grupo sin nombre'}</td>
                          <td className="py-4 px-6 text-slate-600">{nombreCurso}</td>
                          <td className="py-4 px-6 text-slate-600">{g.horario || 'Por definir'}</td>
                          <td className="py-4 px-6 text-slate-600">{g.ocupacion || '0/10'}</td>
                          <td className="py-4 px-6 text-slate-600">{g.progreso || '0%'}</td>
                          <td className="py-4 px-6 font-bold text-slate-900">${g.costo || '0,00'}</td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">
                              {g.estado || 'Activo'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pestanaActiva === 'workshops' && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <p className="text-sm font-bold text-slate-700">No hay workshops registrados para este curso.</p>
              <button onClick={() => alert('Crear workshop')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold">+ Crear Workshop</button>
            </div>
          )}

          {pestanaActiva === 'imagenes' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 space-y-6 shadow-xs">
              <h3 className="text-base font-extrabold text-slate-900">Gestión de Imágenes y Miniaturas</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center space-y-3">
                  <span className="text-2xl">🖼️</span>
                  <div className="text-xs font-bold text-slate-700">Thumbnail (1200x800)</div>
                  <input type="url" placeholder="URL de la imagen..." value={formEdicion.foto_url} onChange={(e) => setFormEdicion({ ...formEdicion, foto_url: e.target.value })} className="w-full p-3 border rounded-xl text-xs bg-slate-50" />
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  )
}
