'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function InscripcionesAdminPage() {
  const [inscripciones, setInscripciones] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [cursos, setCursos] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Modal Nueva Inscripción (Estilo Craqui)
  const [modalNuevaInscripcion, setModalNuevaInscripcion] = useState(false)
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [busquedaAlumno, setBusquedaAlumno] = useState('')
  const [busquedaCurso, setBusquedaCurso] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)

    // 1. Cargar inscripciones
    const { data: resIns } = await supabase.from('inscripciones').select('*').order('id', { ascending: false })
    
    // 2. Cargar catálogos
    const { data: resAlumnos } = await supabase.from('alumnos').select('*')
    const { data: resCursos } = await supabase.from('cursos').select('*')
    const { data: resGrupos } = await supabase.from('grupos').select('*')

    if (resAlumnos) setAlumnos(resAlumnos)
    if (resCursos) setCursos(resCursos)
    if (resGrupos) setGrupos(resGrupos)

    if (resIns && resAlumnos && resGrupos && resCursos) {
      const mapeadas = resIns.map(ins => {
        const al = resAlumnos.find(a => Number(a.id) === Number(ins.alumno_id))
        const gr = resGrupos.find(g => Number(g.id) === Number(ins.grupo_id))
        const cur = gr ? resCursos.find(c => Number(c.id) === Number(gr.curso_id)) : (ins.curso_id ? resCursos.find(c => Number(c.id) === Number(ins.curso_id)) : null)

        return {
          id: ins.id,
          estatus: ins.estatus || 'activa',
          fecha: ins.fecha_inscripcion || 'Reciente',
          alumnoNombre: al?.nombre || al?.Nombre || 'Estudiante',
          alumnoMatricula: al?.matricula || `EAC-${al?.id}`,
          alumnoCorreo: al?.correo || al?.Correo || 'Sin mail',
          alumnoId: al?.id,
          grupoNombre: gr?.nombre_grupo || 'Grupo',
          cursoNombre: cur?.Nombre_curso || cur?.nombre_curso || 'Curso',
          costoTotal: gr?.costo_total || 0,
          numPagos: gr?.num_pagos || 1
        }
      })
      setInscripciones(mapeadas)
    }

    setLoading(false)
  }

  const confirmarInscripcionModal = async () => {
    if (!alumnoSeleccionado) return alert('Seleccione un estudiante.')
    if (!cursoSeleccionado) return alert('Seleccione un curso.')
    if (!grupoSeleccionado) return alert('Seleccione un grupo o horario.')

    setGuardando(true)

    // A. Insertar inscripción asegurando el curso_id del curso seleccionado
    const { error: errIns } = await supabase.from('inscripciones').insert([
      {
        alumno_id: alumnoSeleccionado.id,
        grupo_id: grupoSeleccionado.id,
        curso_id: cursoSeleccionado.id,
        estatus: 'activa'
      }
    ])

    if (errIns) {
      setGuardando(false)
      return alert('Error al inscribir: ' + errIns.message)
    }

    // B. Generar cuotas automáticas usando cursoSeleccionado.id con seguridad
    const costoTotal = Number(grupoSeleccionado.costo_total) || 0
    const numPagos = Number(grupoSeleccionado.num_pagos) || 1
    const montoPorPago = costoTotal / numPagos
    const frecuencia = grupoSeleccionado.frecuencia || 'mensual'

    const fechaInicioBase = grupoSeleccionado.fecha_inicio ? new Date(grupoSeleccionado.fecha_inicio) : new Date()
    const cuotasARegistrar = []

    for (let i = 0; i < numPagos; i++) {
      let fechaVenc = new Date(fechaInicioBase)
      if (frecuencia === 'diaria') fechaVenc.setDate(fechaVenc.getDate() + i)
      else if (frecuencia === 'semanal') fechaVenc.setDate(fechaVenc.getDate() + (i * 7))
      else if (frecuencia === 'quincenal') fechaVenc.setDate(fechaVenc.getDate() + (i * 15))
      else fechaVenc.setMonth(fechaVenc.getMonth() + i)

      cuotasARegistrar.push({
        alumno_id: alumnoSeleccionado.id,
        grupo_id: grupoSeleccionado.id,
        curso_id: cursoSeleccionado.id, // <-- Garantizado mediante el estado del curso seleccionado
        monto: montoPorPago,
        fecha_vencimiento: fechaVenc.toISOString().split('T')[0],
        estatus: 'Pendiente'
      })
    }

    const { error: errPagos } = await supabase.from('pagos').insert(cuotasARegistrar)

    if (errPagos) {
      alert('Inscripción creada, pero hubo un error al generar las cuotas: ' + errPagos.message)
    } else {
      alert('¡Inscripción y plan de pagos generado con éxito!')
      setModalNuevaInscripcion(false)
      setAlumnoSeleccionado(null)
      setCursoSeleccionado(null)
      setGrupoSeleccionado(null)
      cargarDatos()
    }
    setGuardando(false)
  }

  const alumnosFiltradosModal = alumnos.filter(a => {
    const nombre = a.nombre || a.Nombre || ''
    return nombre.toLowerCase().includes(busquedaAlumno.toLowerCase())
  })

  const gruposDelCursoSeleccionado = cursoSeleccionado 
    ? grupos.filter(g => Number(g.curso_id) === Number(cursoSeleccionado.id))
    : []

  const inscripcionesFiltradas = inscripciones.filter(i => 
    i.alumnoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.cursoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.grupoNombre.toLowerCase().includes(busqueda.toLowerCase())
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
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Inscripciones</h2>
          <button 
            onClick={() => setModalNuevaInscripcion(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <span>+</span> Nueva Inscripción
          </button>
        </header>

        {/* VISTA GENERAL */}
        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
          
          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <span className="text-slate-400 text-sm pl-2">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por estudiante, curso o grupo..." 
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* TABLA ESTILO CRAQUI */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Listado de Inscripciones ({inscripcionesFiltradas.length})</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16 text-xs text-slate-400">Cargando inscripciones...</div>
              ) : inscripcionesFiltradas.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">No hay inscripciones registradas.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-6">Estudiante</th>
                      <th className="py-3 px-6">Curso / Grupo</th>
                      <th className="py-3 px-6">Estado</th>
                      <th className="py-3 px-6">Fecha</th>
                      <th className="py-3 px-6 text-right">Precio / Cuotas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {inscripcionesFiltradas.map((ins) => (
                      <tr key={ins.id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{ins.alumnoNombre}</div>
                          <span className="text-[10px] text-slate-400">{ins.alumnoCorreo}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-800">{ins.cursoNombre}</div>
                          <span className="text-[11px] text-indigo-600 font-semibold">{ins.grupoNombre}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
                            Confirmada
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">
                          Registrada
                        </td>
                        <td className="py-4 px-6 text-right font-mono">
                          <div className="font-bold text-slate-900">$ {Number(ins.costoTotal).toLocaleString('es-MX')} MXN</div>
                          <span className="text-[10px] text-slate-400">{ins.numPagos} pago(s) programados</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* MODAL NUEVA INSCRIPCIÓN (ESTILO CRAQUI DE DOS PANELES) */}
      {modalNuevaInscripcion && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Nueva Inscripción</h3>
                <p className="text-xs text-slate-400">Selecciona al estudiante y el curso correspondiente para matricularlo.</p>
              </div>
              <button onClick={() => setModalNuevaInscripcion(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold">✕</button>
            </div>

            {/* DOS COLUMNAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* COLUMNA IZQUIERDA: SELECCIONAR ESTUDIANTE */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">1. Seleccionar Estudiante</h4>
                <input 
                  type="text" 
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  placeholder="Buscar estudiante..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-600"
                />

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {alumnosFiltradosModal.map(a => {
                    const nombreAl = a.nombre || a.Nombre || 'Estudiante'
                    const estaSeleccionado = alumnoSeleccionado?.id === a.id

                    return (
                      <div 
                        key={a.id} 
                        onClick={() => setAlumnoSeleccionado(a)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition flex justify-between items-center ${estaSeleccionado ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-bold' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div>
                          <div>{nombreAl}</div>
                          <span className="text-[10px] text-slate-400 font-mono">#{a.matricula || `EAC-${a.id}`}</span>
                        </div>
                        {estaSeleccionado && <span className="text-indigo-600 text-xs font-bold">✓ Seleccionado</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* COLUMNA DERECHA: SELECCIONAR CURSO Y GRUPO */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">2. Seleccionar Curso y Grupo</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Curso Madre</label>
                    <select 
                      value={cursoSeleccionado?.id || ''}
                      onChange={(e) => {
                        const cur = cursos.find(c => String(c.id) === String(e.target.value))
                        setCursoSeleccionado(cur || null)
                        setGrupoSeleccionado(null)
                      }}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-600"
                    >
                      <option value="">Seleccione un curso...</option>
                      {cursos.map(c => (
                        <option key={c.id} value={c.id}>{c.Nombre_curso || c.nombre_curso}</option>
                      ))}
                    </select>
                  </div>

                  {cursoSeleccionado && (
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Grupo / Horario</label>
                      <select 
                        value={grupoSeleccionado?.id || ''}
                        onChange={(e) => {
                          const gr = grupos.find(g => String(g.id) === String(e.target.value))
                          setGrupoSeleccionado(gr || null)
                        }}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-indigo-600"
                      >
                        <option value="">Seleccione grupo y costo...</option>
                        {gruposDelCursoSeleccionado.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.nombre_grupo} — ${g.costo_total} MXN ({g.num_pagos} pagos {g.frecuencia})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {grupoSeleccionado && (
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1 text-xs">
                      <div className="font-bold text-indigo-900">Resumen Financiero del Grupo:</div>
                      <div className="text-indigo-700">Costo Total: $ {grupoSeleccionado.costo_total} MXN</div>
                      <div className="text-indigo-700">Plan: {grupoSeleccionado.num_pagos} pagos de $ {(Number(grupoSeleccionado.costo_total) / Number(grupoSeleccionado.num_pagos)).toFixed(2)} MXN ({grupoSeleccionado.frecuencia})</div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setModalNuevaInscripcion(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
              <button 
                type="button" 
                disabled={guardando || !alumnoSeleccionado || !cursoSeleccionado || !grupoSeleccionado}
                onClick={confirmarInscripcionModal}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
              >
                {guardando ? 'Inscribiendo...' : 'Confirmar e Inscribir Estudiante'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
