'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function GruposAdminPage() {
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Modales
  const [modalGrupo, setModalGrupo] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Formulario Nuevo Grupo
  const [formGrupo, setFormGrupo] = useState({
    curso_id: '',
    nombre_grupo: '',
    fecha_inicio: '',
    fecha_fin: '',
    duracion_acceso: '1_ano',
    costo_total: '',
    num_pagos: 1,
    frecuencia: 'mensual'
  })

  // Formulario Recurso para el Grupo
  const [formRecurso, setFormRecurso] = useState({ titulo: '', tipo: 'video', url: '' })

  // Estados para Reprogramación Masiva de Pagos por Grupo
  const [fechaOriginalAjuste, setFechaOriginalAjuste] = useState('')
  const [fechaNuevaAjuste, setFechaNuevaAjuste] = useState('')
  const [guardandoMasivo, setGuardandoMasivo] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const { data: resGrupos } = await supabase.from('grupos').select('*').order('id', { ascending: false })
    const { data: resCursos } = await supabase.from('cursos').select('*')
    const { data: resRecursos } = await supabase.from('recursos').select('*')

    if (resGrupos) setGrupos(resGrupos)
    if (resCursos) setCursos(resCursos)
    if (resRecursos) setRecursos(resRecursos)
    setLoading(false)
  }

  const crearGrupo = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('grupos').insert([{
      curso_id: Number(formGrupo.curso_id),
      nombre_grupo: formGrupo.nombre_grupo.trim(),
      fecha_inicio: formGrupo.fecha_inicio || null,
      fecha_fin: formGrupo.fecha_fin || null,
      duracion_acceso: formGrupo.duracion_acceso,
      costo_total: Number(formGrupo.costo_total),
      num_pagos: Number(formGrupo.num_pagos),
      frecuencia: formGrupo.frecuencia
    }])

    if (error) {
      alert('Error al crear grupo: ' + error.message)
    } else {
      setModalGrupo(false)
      setFormGrupo({ curso_id: '', nombre_grupo: '', fecha_inicio: '', fecha_fin: '', duracion_acceso: '1_ano', costo_total: '', num_pagos: 1, frecuencia: 'mensual' })
      cargarDatos()
      alert('¡Grupo creado exitosamente!')
    }
    setGuardando(false)
  }

  const agregarRecursoAGrupo = async (e) => {
    e.preventDefault()
    if (!formRecurso.titulo.trim() || !formRecurso.url.trim()) return

    const { error } = await supabase.from('recursos').insert([{
      grupo_id: grupoSeleccionado.id,
      titulo: formRecurso.titulo.trim(),
      tipo: formRecurso.tipo,
      url: formRecurso.url.trim()
    }])

    if (error) {
      alert('Error al agregar recurso: ' + error.message)
    } else {
      setFormRecurso({ titulo: '', tipo: 'video', url: '' })
      cargarDatos()
      alert('¡Material agregado al grupo!')
    }
  }

  const eliminarRecurso = async (idRecurso) => {
    const { error } = await supabase.from('recursos').delete().eq('id', idRecurso)
    if (!error) cargarDatos()
  }

  const eliminarGrupo = async () => {
    if (!confirm('¿Estás seguro de eliminar este grupo? Se perderán sus inscripciones y pagos asociados.')) return
    const { error } = await supabase.from('grupos').delete().eq('id', grupoSeleccionado.id)
    if (!error) {
      setModalDetalle(false)
      setGrupoSeleccionado(null)
      cargarDatos()
      alert('Grupo eliminado.')
    }
  }

  // Función de Reprogramación Masiva por Grupo (Afecta a todos los alumnos del grupo en cadena)
  const ejecutarAjusteMasivoPagos = async (e) => {
    e.preventDefault()
    if (!fechaOriginalAjuste || !fechaNuevaAjuste) return alert('Selecciona ambas fechas.')

    setGuardandoMasivo(true)

    const fAntigua = new Date(fechaOriginalAjuste)
    const fNueva = new Date(fechaNuevaAjuste)
    const diffMs = fNueva.getTime() - fAntigua.getTime()
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

    // Buscar todos los pagos pendientes de este grupo cuya fecha sea >= fecha original buscada
    const { data: pagosGrupo, error: errBusqueda } = await supabase
      .from('pagos')
      .select('*')
      .eq('grupo_id', grupoSeleccionado.id)
      .eq('estatus', 'Pendiente')
      .gte('fecha_vencimiento', fechaOriginalAjuste)

    if (errBusqueda) {
      setGuardandoMasivo(false)
      return alert('Error al buscar pagos: ' + errBusqueda.message)
    }

    if (!pagosGrupo || pagosGrupo.length === 0) {
      setGuardandoMasivo(false)
      return alert('No se encontraron pagos pendientes con esa fecha o posteriores en este grupo.')
    }

    // Actualizar en cadena cada pago afectado sumándole la diferencia exacta de días
    let contadorActualizados = 0
    for (let p of pagosGrupo) {
      const fAct = new Date(p.fecha_vencimiento)
      fAct.setDate(fAct.getDate() + diffDias)
      const nuevaFStr = fAct.toISOString().split('T')[0]

      const { error: errUpdate } = await supabase
        .from('pagos')
        .update({ fecha_vencimiento: nuevaFStr })
        .eq('id', p.id)

      if (!errUpdate) contadorActualizados++
    }

    alert(`¡Calendario actualizado con éxito! Se reprogramaron ${contadorActualizados} cuotas pendientes para todos los alumnos de este grupo.`)
    setFechaOriginalAjuste('')
    setFechaNuevaAjuste('')
    setGuardandoMasivo(false)
  }

  const gruposFiltrados = grupos.filter(g => {
    const cursoAsociado = cursos.find(c => Number(c.id) === Number(g.curso_id))
    const nombreCurso = cursoAsociado?.Nombre_curso || cursoAsociado?.nombre_curso || ''
    return g.nombre_grupo.toLowerCase().includes(busqueda.toLowerCase()) || nombreCurso.toLowerCase().includes(busqueda.toLowerCase())
  })

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
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Gestión de Grupos y Contenidos</h2>
          <button onClick={() => setModalGrupo(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition">
            + Nuevo Grupo
          </button>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <span className="text-slate-400 text-sm pl-2">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por grupo o curso..." 
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gruposFiltrados.map((g) => {
              const cursoAsociado = cursos.find(c => Number(c.id) === Number(g.curso_id))
              const nombreCurso = cursoAsociado?.Nombre_curso || cursoAsociado?.nombre_curso || 'Curso General'
              const recursosGrupo = recursos.filter(r => Number(r.grupo_id) === Number(g.id))

              return (
                <div 
                  key={g.id} 
                  onClick={() => { setGrupoSeleccionado(g); setModalDetalle(true); }}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between cursor-pointer hover:border-indigo-400 transition"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase">
                        {nombreCurso}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                        {recursosGrupo.length} material(es)
                      </span>
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900">{g.nombre_grupo}</h4>
                    <p className="text-xs text-slate-500">📅 Inicio: <strong className="text-slate-700">{g.fecha_inicio || 'Por definir'}</strong></p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Costo</span>
                      <span className="font-extrabold text-indigo-600">$ {Number(g.costo_total).toLocaleString('es-MX')} MXN</span>
                    </div>
                    <span className="text-indigo-600 font-semibold">Gestionar grupo →</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* MODAL NUEVO GRUPO */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Crear Nuevo Grupo / Edición</h3>
            <form onSubmit={crearGrupo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Seleccionar Curso *</label>
                <select 
                  required
                  value={formGrupo.curso_id}
                  onChange={(e) => setFormGrupo({ ...formGrupo, curso_id: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                >
                  <option value="">Seleccione un curso...</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.Nombre_curso || c.nombre_curso}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Grupo *</label>
                <input 
                  type="text" 
                  required
                  value={formGrupo.nombre_grupo}
                  onChange={(e) => setFormGrupo({ ...formGrupo, nombre_grupo: e.target.value })}
                  placeholder="Ej. Matutino · Lunes"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha Inicio</label>
                  <input type="date" value={formGrupo.fecha_inicio} onChange={(e) => setFormGrupo({ ...formGrupo, fecha_inicio: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha Fin</label>
                  <input type="date" value={formGrupo.fecha_fin} onChange={(e) => setFormGrupo({ ...formGrupo, fecha_fin: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Costo Total ($)</label>
                  <input type="number" required value={formGrupo.costo_total} onChange={(e) => setFormGrupo({ ...formGrupo, costo_total: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Número de Pagos</label>
                  <input type="number" required min="1" value={formGrupo.num_pagos} onChange={(e) => setFormGrupo({ ...formGrupo, num_pagos: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Frecuencia de Pago</label>
                <select value={formGrupo.frecuencia} onChange={(e) => setFormGrupo({ ...formGrupo, frecuencia: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none">
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalGrupo(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Crear Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE GRUPO, RECURSOS Y AJUSTE MASIVO DE PAGOS */}
      {modalDetalle && grupoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gestión del Grupo: {grupoSeleccionado.nombre_grupo}</h3>
                <p className="text-xs text-slate-400">Administra recursos y ajusta el calendario financiero para todo el grupo.</p>
              </div>
              <button onClick={eliminarGrupo} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-xl text-xs font-semibold">Eliminar Grupo</button>
            </div>

            {/* NUEVA SECCIÓN: REPROGRAMACIÓN MASIVA DE PAGOS POR GRUPO */}
            <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase text-indigo-900 tracking-wider">📅 Ajuste Masivo de Calendario de Pagos</h4>
                <p className="text-[11px] text-indigo-700">Si un día festivo recorrió una clase (ej. del 15 al 22 de septiembre), indica la fecha original y la nueva fecha para desplazar en cadena a todos los alumnos inscritos en este grupo.</p>
              </div>

              <form onSubmit={ejecutarAjusteMasivoPagos} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha original a mover</label>
                  <input 
                    type="date" 
                    required
                    value={fechaOriginalAjuste}
                    onChange={(e) => setFechaOriginalAjuste(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nueva fecha de destino</label>
                  <input 
                    type="date" 
                    required
                    value={fechaNuevaAjuste}
                    onChange={(e) => setFechaNuevaAjuste(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={guardandoMasivo}
                  className="sm:col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {guardandoMasivo ? 'Actualizando pagos del grupo...' : '🔄 Reprogramar Pagos de todo el Grupo'}
                </button>
              </form>
            </div>

            {/* SUBIR RECURSOS */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Subir Material para este Grupo</h4>
              <form onSubmit={agregarRecursoAGrupo} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  required
                  placeholder="Título (Ej. Clase 1 Grabada)"
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
                  placeholder="URL (YouTube, Drive...)"
                  value={formRecurso.url}
                  onChange={(e) => setFormRecurso({ ...formRecurso, url: e.target.value })}
                  className="p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                />
                <button type="submit" className="sm:col-span-3 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold">
                  + Agregar Material a este Grupo
                </button>
              </form>

              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Materiales de este grupo:</span>
                {recursos.filter(r => Number(r.grupo_id) === Number(grupoSeleccionado.id)).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay recursos subidos para este grupo aún.</p>
                ) : (
                  recursos.filter(r => Number(r.grupo_id) === Number(grupoSeleccionado.id)).map(rec => (
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
