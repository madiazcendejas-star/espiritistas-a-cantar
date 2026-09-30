'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function CursosAdminPage() {
  const [cursos, setCursos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)

  // Buscador
  const [busqueda, setBusqueda] = useState('')

  // Modales y Pestañas del Detalle del Curso
  const [modalCurso, setModalCurso] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [pestanaDetalle, setPestanaDetalle] = useState('detalles') // 'detalles' o 'grupos'
  const [guardando, setGuardando] = useState(false)

  // Formulario Nuevo Curso
  const [formCurso, setFormCurso] = useState({ Nombre_curso: '', descripcion: '', precio: '', foto_url: '' })
  // Formulario Editar Curso
  const [formEdicion, setFormEdicion] = useState({ Nombre_curso: '', descripcion: '', precio: '', foto_url: '' })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const { data: resCursos } = await supabase.from('cursos').select('*').order('id', { ascending: false })
    const { data: resGrupos } = await supabase.from('grupos').select('*')
    const { data: resEstudiantes } = await supabase.from('estudiantes').select('*')

    if (resCursos) setCursos(resCursos)
    if (resGrupos) setGrupos(resGrupos)
    if (resEstudiantes) setEstudiantes(resEstudiantes)
    setLoading(false)
  }

  const crearCurso = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('cursos').insert([{
      Nombre_curso: formCurso.Nombre_curso.trim(),
      descripcion: formCurso.descripcion.trim(),
      precio: Number(formCurso.precio) || 0,
      foto_url: formCurso.foto_url.trim() || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'
    }])

    if (error) {
      alert('Error al crear curso: ' + error.message)
    } else {
      setModalCurso(false)
      setFormCurso({ Nombre_curso: '', descripcion: '', precio: '', foto_url: '' })
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
        descripcion: formEdicion.descripcion.trim(),
        precio: Number(formEdicion.precio) || 0,
        foto_url: formEdicion.foto_url.trim()
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
      descripcion: curso.descripcion || '',
      precio: curso.precio || '',
      foto_url: curso.foto_url || ''
    })
    setPestanaDetalle('detalles')
    setModalDetalle(true)
  }

  // Filtrado de cursos dinámico
  const cursosFiltrados = cursos.filter(c => {
    const nombre = (c.Nombre_curso || c.nombre_curso || '').toLowerCase()
    return nombre.includes(busqueda.toLowerCase())
  })

  // Métricas
  const totalCursos = cursos.length
  const gruposActivos = grupos.filter(g => g.estado === 'activo' || !g.estado).length
  const estudiantesActivos = estudiantes.length

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
        
        {/* HEADER SUPERIOR */}
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Cursos</h1>
            <p className="text-xs text-slate-500 font-medium">Gestiona los cursos de tu academia</p>
          </div>
          <button 
            onClick={() => setModalCurso(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/20 transition transform active:scale-95"
          >
            + Nuevo curso
          </button>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* TARJETAS DINÁMICAS MODERNAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Cursos</span>
              <div className="text-3xl font-black text-slate-900">{totalCursos}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Grupos activos</span>
              <div className="text-3xl font-black text-indigo-600">{gruposActivos}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estudiantes activos</span>
              <div className="text-3xl font-black text-slate-900">{estudiantesActivos}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Ocupación</span>
              <div className="text-3xl font-black text-emerald-600">85%</div>
              <span className="text-xs text-slate-400 font-medium">Sobre grupos activos</span>
            </div>
          </div>

          {/* BUSCADOR DINÁMICO ROBUSTO */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400 text-sm">🔍</span>
              <input 
                type="text"
                placeholder="Buscar cursos por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* TABLA DE CURSOS MODERNA */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-8">Curso</th>
                  <th className="py-4 px-6">Grupos</th>
                  <th className="py-4 px-6">Ocupación</th>
                  <th className="py-4 px-8">Precio (Desde)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {cursosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-slate-400 italic">No se encontraron cursos registrados.</td>
                  </tr>
                ) : (
                  cursosFiltrados.map((c) => {
                    const nombreCurso = c.Nombre_curso || c.nombre_curso || 'Curso sin nombre'
                    const gruposDelCurso = grupos.filter(g => Number(g.curso_id) === Number(c.id))
                    
                    return (
                      <tr 
                        key={c.id} 
                        onClick={() => abrirDetalleCurso(c)}
                        className="hover:bg-slate-50/80 cursor-pointer transition group"
                      >
                        <td className="py-4 px-8 flex items-center gap-4">
                          <img 
                            src={c.foto_url || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'} 
                            alt={nombreCurso} 
                            className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-xs group-hover:scale-105 transition"
                          />
                          <span className="font-bold text-slate-900 text-base">{nombreCurso}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-600 font-semibold">
                          👥 {gruposDelCurso.length} grupos
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold">
                              80% · Casi lleno
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-8 font-extrabold text-slate-900 text-base">
                          ${c.precio || '0,00'} UYU
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* MODAL NUEVO CURSO */}
      {modalCurso && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <h3 className="text-xl font-extrabold text-slate-900">Nuevo Curso</h3>
            <form onSubmit={crearCurso} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Nombre del Curso *</label>
                <input 
                  type="text" 
                  required
                  value={formCurso.Nombre_curso}
                  onChange={(e) => setFormCurso({ ...formCurso, Nombre_curso: e.target.value })}
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Descripción</label>
                <textarea 
                  rows="3"
                  value={formCurso.descripcion}
                  onChange={(e) => setFormCurso({ ...formCurso, descripcion: e.target.value })}
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none resize-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Precio (Desde)</label>
                <input 
                  type="number"
                  value={formCurso.precio}
                  onChange={(e) => setFormCurso({ ...formCurso, precio: e.target.value })}
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">URL de la Foto</label>
                <input 
                  type="url"
                  value={formCurso.foto_url}
                  onChange={(e) => setFormCurso({ ...formCurso, foto_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setModalCurso(false)} className="px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/20">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPEDIENTE / DETALLE DEL CURSO (MODAL CON PESTAÑAS) */}
      {modalDetalle && cursoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera del Expediente */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cursoSeleccionado.Nombre_curso || cursoSeleccionado.nombre_curso}</h3>
                <p className="text-xs text-slate-500 font-medium">Gestiona los detalles del curso y sus grupos asociados.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={eliminarCurso} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-2xl text-xs font-bold transition">Eliminar Curso</button>
                <button onClick={() => setModalDetalle(false)} className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-2xl text-xs font-bold transition">Cerrar</button>
              </div>
            </div>

            {/* Pestañas de Navegación del Expediente */}
            <div className="flex gap-6 border-b border-slate-200 text-sm font-bold">
              <button 
                onClick={() => setPestanaDetalle('detalles')}
                className={`pb-3 border-b-2 transition ${pestanaDetalle === 'detalles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                📝 Detalles
              </button>
              <button 
                onClick={() => setPestanaDetalle('grupos')}
                className={`pb-3 border-b-2 transition ${pestanaDetalle === 'grupos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
              >
                🏛️ Grupos ({grupos.filter(g => Number(g.curso_id) === Number(cursoSeleccionado.id)).length})
              </button>
            </div>

            {/* CONTENIDO DE PESTAÑA: DETALLES */}
            {pestanaDetalle === 'detalles' && (
              <form onSubmit={guardarEdicionCurso} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Nombre del Curso</label>
                  <input 
                    type="text" 
                    required
                    value={formEdicion.Nombre_curso}
                    onChange={(e) => setFormEdicion({ ...formEdicion, Nombre_curso: e.target.value })}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Descripción</label>
                  <textarea 
                    rows="3"
                    value={formEdicion.descripcion}
                    onChange={(e) => setFormEdicion({ ...formEdicion, descripcion: e.target.value })}
                    className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none resize-none focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Precio (Desde)</label>
                    <input 
                      type="number"
                      value={formEdicion.precio}
                      onChange={(e) => setFormEdicion({ ...formEdicion, precio: e.target.value })}
                      className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">URL Foto</label>
                    <input 
                      type="url"
                      value={formEdicion.foto_url}
                      onChange={(e) => setFormEdicion({ ...formEdicion, foto_url: e.target.value })}
                      className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>
                </div>
                <div className="text-xs text-slate-400 font-medium pt-2">
                  Fecha de creación: {new Date(cursoSeleccionado.created_at || Date.now()).toLocaleDateString()}
                </div>
                <div className="flex justify-end pt-4">
                  <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/20">Guardar Cambios</button>
                </div>
              </form>
            )}

            {/* CONTENIDO DE PESTAÑA: GRUPOS */}
            {pestanaDetalle === 'grupos' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm font-medium">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider">
                        <th className="py-3.5 px-4">Grupo</th>
                        <th className="py-3.5 px-4">Curso</th>
                        <th className="py-3.5 px-4">Horario</th>
                        <th className="py-3.5 px-4">Ocupación</th>
                        <th className="py-3.5 px-4">Progreso</th>
                        <th className="py-3.5 px-4">Costo</th>
                        <th className="py-3.5 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grupos.filter(g => Number(g.curso_id) === Number(cursoSeleccionado.id)).length === 0 ? (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-slate-400 italic">No hay grupos ligados a este curso.</td>
                        </tr>
                      ) : (
                        grupos.filter(g => Number(g.curso_id) === Number(cursoSeleccionado.id)).map(g => (
                          <tr key={g.id} onClick={() => alert(`Ir al detalle del grupo: ${g.nombre || g.grupo}`)} className="hover:bg-slate-50 cursor-pointer transition">
                            <td className="py-4 px-4 font-bold text-slate-900">{g.nombre || g.grupo || 'Grupo sin nombre'}</td>
                            <td className="py-4 px-4 text-slate-600">{cursoSeleccionado.Nombre_curso}</td>
                            <td className="py-4 px-4 text-slate-600">{g.horario || 'Por definir'}</td>
                            <td className="py-4 px-4 text-slate-600">{g.ocupacion || '0/10'}</td>
                            <td className="py-4 px-4 text-slate-600">{g.progreso || '0%'}</td>
                            <td className="py-4 px-4 font-bold text-slate-900">${g.costo || '0,00'}</td>
                            <td className="py-4 px-4">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">
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

          </div>
        </div>
      )}

    </div>
  )
}
