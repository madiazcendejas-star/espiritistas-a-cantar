'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function GruposAdminPage() {
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Modal Nuevo Grupo
  const [modalGrupo, setModalGrupo] = useState(false)
  const [guardando, setGuardando] = useState(false)

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

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    // Cargar grupos con su curso relacionado
    const { data: resGrupos } = await supabase
      .from('grupos')
      .select('*, cursos(nombre_curso)')
      .order('id', { ascending: false })

    // Cargar catálogo de cursos para el selector del modal
    const { data: resCursos } = await supabase.from('cursos').select('*')

    if (resGrupos) setGrupos(resGrupos)
    if (resCursos) setCursos(resCursos)
    setLoading(false)
  }

  const crearGrupo = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase.from('grupos').insert([
      {
        curso_id: formGrupo.curso_id,
        nombre_grupo: formGrupo.nombre_grupo.trim(),
        fecha_inicio: formGrupo.fecha_inicio || null,
        fecha_fin: formGrupo.fecha_fin || null,
        duracion_acceso: formGrupo.duracion_acceso,
        costo_total: Number(formGrupo.costo_total),
        num_pagos: Number(formGrupo.num_pagos),
        frecuencia: formGrupo.frecuencia
      }
    ])

    if (error) {
      alert('Error al crear grupo: ' + error.message)
    } else {
      setModalGrupo(false)
      setFormGrupo({
        curso_id: '',
        nombre_grupo: '',
        fecha_inicio: '',
        fecha_fin: '',
        duracion_acceso: '1_ano',
        costo_total: '',
        num_pagos: 1,
        frecuencia: 'mensual'
      })
      cargarDatos()
      alert('¡Grupo creado exitosamente!')
    }
    setGuardando(false)
  }

  const gruposFiltrados = grupos.filter(g => 
    g.nombre_grupo.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.cursos?.nombre_curso?.toLowerCase().includes(busqueda.toLowerCase())
  )

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
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Gestión de Grupos y Horarios</h2>
          <button 
            onClick={() => setModalGrupo(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <span>+</span> Nuevo Grupo
          </button>
        </header>

        {/* VISTA GENERAL */}
        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* KPI Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Grupos Activos</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{grupos.length}</h3>
              </div>
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl text-lg">🏛️</span>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Cursos Asociados</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{cursos.length}</h3>
              </div>
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-lg">📚</span>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Estatus del Sistema</span>
                <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">Sincronizado</h3>
              </div>
              <span className="p-3 bg-purple-50 text-purple-600 rounded-2xl text-lg">⚡</span>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <span className="text-slate-400 text-sm pl-2">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre de grupo o curso..." 
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* LISTADO DE GRUPOS */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Ediciones y Horarios Registrados</h3>
            {loading ? (
              <div className="text-center py-12 text-xs text-slate-400">Cargando grupos...</div>
            ) : gruposFiltrados.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No se encontraron grupos registrados. Haz clic en "+ Nuevo Grupo" para configurar el primero.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gruposFiltrados.map((g) => (
                  <div key={g.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {g.cursos?.nombre_curso || 'Curso General'}
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2.5 py-1 rounded-full">Activo</span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900">{g.nombre_grupo}</h4>
                      <p className="text-xs text-slate-500">
                        📅 Inicio: <strong className="text-slate-700">{g.fecha_inicio || 'Por definir'}</strong> — Fin: <strong className="text-slate-700">{g.fecha_fin || 'Por definir'}</strong>
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Plan Financiero</span>
                        <span className="text-sm font-extrabold text-indigo-600">$ {Number(g.costo_total).toLocaleString('es-MX')} MXN</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        {g.num_pagos} pago{g.num_pagos > 1 ? 's' : ''} ({g.frecuencia})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL NUEVO GRUPO */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-slate-900">Crear Nuevo Grupo / Edición</h3>
              <p className="text-xs text-slate-400 mt-0.5">Configura fechas, costos y planes de pago para este horario.</p>
            </div>
            
            <form onSubmit={crearGrupo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Seleccionar Curso *</label>
                <select 
                  required
                  value={formGrupo.curso_id}
                  onChange={(e) => setFormGrupo({ ...formGrupo, curso_id: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                >
                  <option value="">Seleccione un curso...</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre_curso}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre del Grupo / Horario *</label>
                <input 
                  type="text" 
                  required
                  value={formGrupo.nombre_grupo}
                  onChange={(e) => setFormGrupo({ ...formGrupo, nombre_grupo: e.target.value })}
                  placeholder="Ej. Matutino · Lunes y Miércoles"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha de Inicio</label>
                  <input 
                    type="date" 
                    value={formGrupo.fecha_inicio}
                    onChange={(e) => setFormGrupo({ ...formGrupo, fecha_inicio: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha de Término</label>
                  <input 
                    type="date" 
                    value={formGrupo.fecha_fin}
                    onChange={(e) => setFormGrupo({ ...formGrupo, fecha_fin: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Costo Total ($ MXN) *</label>
                  <input 
                    type="number" 
                    required
                    value={formGrupo.costo_total}
                    onChange={(e) => setFormGrupo({ ...formGrupo, costo_total: e.target.value })}
                    placeholder="1800"
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Número de Pagos *</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    value={formGrupo.num_pagos}
                    onChange={(e) => setFormGrupo({ ...formGrupo, num_pagos: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Disponibilidad / Vigencia de Acceso</label>
                <select 
                  value={formGrupo.duracion_acceso}
                  onChange={(e) => setFormGrupo({ ...formGrupo, duracion_acceso: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                >
                  <option value="1_ano">1 Año</option>
                  <option value="2_anos">2 Años</option>
                  <option value="ilimitado">Ilimitado</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalGrupo(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm">
                  {guardando ? 'Guardando...' : 'Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
