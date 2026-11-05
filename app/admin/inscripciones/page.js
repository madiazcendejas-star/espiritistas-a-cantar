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

  // Modal Nueva Inscripción
  const [modalNuevaInscripcion, setModalNuevaInscripcion] = useState(false)
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null)
  const [cursoSeleccionado, setCursoSeleccionado] = useState(null)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [busquedaAlumno, setBusquedaAlumno] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Modal Gestión de Baja / Becas / Reactivación
  const [modalGestion, setModalGestion] = useState(false)
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState(null)
  const [motivoBaja, setMotivoBaja] = useState('')
  const [tipoAjuste, setTipoAjuste] = useState('baja') // 'baja', 'beca', 'reactivar'
  const [porcentajeBeca, setPorcentajeBeca] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)

    const { data: resIns } = await supabase.from('inscripciones').select('*').order('id', { ascending: false })
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
          motivo_baja: ins.motivo_baja || '',
          alumnoNombre: al?.nombre || al?.Nombre || 'Estudiante',
          alumnoMatricula: al?.matricula || `EAC-${al?.id}`,
          alumnoCorreo: al?.correo || al?.Correo || 'Sin mail',
          alumnoId: al?.id,
          grupoId: gr?.id || ins.grupo_id,
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

    const { data: existente } = await supabase
      .from('inscripciones')
      .select('*')
      .eq('alumno_id', alumnoSeleccionado.id)
      .eq('grupo_id', grupoSeleccionado.id)
      .eq('estatus', 'activa')

    if (existente && existente.length > 0) {
      setGuardando(false)
      return alert('Este estudiante ya tiene una inscripción activa en este grupo.')
    }

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

    const costoTotal = Number(grupoSeleccionado.costo_total) || 0
    const numPagos = Number(grupoSeleccionado.num_pagos) || 1
    const montoPorPago = Number((costoTotal / numPagos).toFixed(2))
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
        curso_id: cursoSeleccionado.id,
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

      const telLimpio = alumnoSeleccionado.telefono ? String(alumnoSeleccionado.telefono).replace(/\D/g, '') : ''
      if (telLimpio) {
        const nombreAl = alumnoSeleccionado.nombre || alumnoSeleccionado.Nombre || 'Estudiante'
        const nombreCur = cursoSeleccionado.Nombre_curso || cursoSeleccionado.nombre_curso || 'Curso'
        const nombreGrp = grupoSeleccionado.nombre_grupo || 'Grupo'

        let mensajeInscripcion = `¡Hola *${nombreAl}*! Tu inscripción al curso *${nombreCur}* (${nombreGrp}) ha sido realizada correctamente.\n\nTe recordamos que puedes consultar los materiales, clases y avisos directamente en tu portal de alumno:\n🔗 https://espiritistasacantar.com/alumno`

        if (grupoSeleccionado.enlace_whatsapp) {
          mensajeInscripcion += `\n\nÚnete a nuestro grupo oficial de WhatsApp para este curso aquí:\n🔗 ${grupoSeleccionado.enlace_whatsapp}`
        }

        mensajeInscripcion += `\n\n¡Nos vemos en clase!`

        const urlWa = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensajeInscripcion)}`
        window.open(urlWa, '_blank')
      } else {
        alert('Aviso: El alumno no tiene un número de teléfono registrado para enviarle el WhatsApp automático de inscripción.')
      }

      setModalNuevaInscripcion(false)
      setAlumnoSeleccionado(null)
      setCursoSeleccionado(null)
      setGrupoSeleccionado(null)
      cargarDatos()
    }
    setGuardando(false)
  }

  const procesarBajaInscripcion = async () => {
    if (!inscripcionSeleccionada) return
    setGuardando(true)

    const { error: errUpd } = await supabase
      .from('inscripciones')
      .update({ 
        estatus: 'baja',
        motivo_baja: motivoBaja || 'Sin motivo especificado'
      })
      .eq('id', inscripcionSeleccionada.id)

    if (errUpd) {
      setGuardando(false)
      return alert('Error al actualizar la inscripción: ' + errUpd.message)
    }

    const { error: errPagos } = await supabase
      .from('pagos')
      .update({ estatus: 'Cancelado', monto: 0 })
      .eq('alumno_id', inscripcionSeleccionada.alumnoId)
      .eq('grupo_id', inscripcionSeleccionada.grupoId)
      .eq('estatus', 'Pendiente')

    if (errPagos) {
      alert('Inscripción dada de baja, pero hubo un detalle al ajustar los pagos pendientes: ' + errPagos.message)
    } else {
      alert('Estudiante dado de baja correctamente. Los pagos pendientes se han ajustado a $0.')
      setModalGestion(false)
      setInscripcionSeleccionada(null)
      setMotivoBaja('')
      cargarDatos()
    }
    setGuardando(false)
  }

  const procesarReactivacionInscripcion = async () => {
    if (!inscripcionSeleccionada) return
    setGuardando(true)

    const { error: errUpd } = await supabase
      .from('inscripciones')
      .update({ estatus: 'activa', motivo_baja: null })
      .eq('id', inscripcionSeleccionada.id)

    if (errUpd) {
      setGuardando(false)
      return alert('Error al reactivar la inscripción: ' + errUpd.message)
    }

    const grupoInfo = grupos.find(g => Number(g.id) === Number(inscripcionSeleccionada.grupoId))
    const costoTotal = grupoInfo ? Number(grupoInfo.costo_total) || 0 : Number(inscripcionSeleccionada.costoTotal) || 0
    const numPagos = grupoInfo ? Number(grupoInfo.num_pagos) || 1 : Number(inscripcionSeleccionada.numPagos) || 1
    const montoPorPago = Number((costoTotal / numPagos).toFixed(2))

    const { error: errPagos } = await supabase
      .from('pagos')
      .update({ estatus: 'Pendiente', monto: montoPorPago })
      .eq('alumno_id', inscripcionSeleccionada.alumnoId)
      .eq('grupo_id', inscripcionSeleccionada.grupoId)
      .eq('estatus', 'Cancelado')
      .eq('monto', 0)

    if (errPagos) {
      alert('Inscripción reactivada, pero hubo un detalle al restaurar los pagos pendientes: ' + errPagos.message)
    } else {
      alert('¡Estudiante reincorporado con éxito! Sus pagos pendientes se han restaurado al plan financiero.')
      setModalGestion(false)
      setInscripcionSeleccionada(null)
      cargarDatos()
    }
    setGuardando(false)
  }

  const procesarBecaInscripcion = async () => {
    if (!inscripcionSeleccionada || !porcentajeBeca) return alert('Ingrese un porcentaje de descuento válido.')
    setGuardando(true)

    const descuento = Number(porcentajeBeca) / 100
    if (descuento <= 0 || descuento > 1) {
      setGuardando(false)
      return alert('Porcentaje inválido.')
    }

    const { data: pagosPendientes } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', inscripcionSeleccionada.alumnoId)
      .eq('grupo_id', inscripcionSeleccionada.grupoId)
      .eq('estatus', 'Pendiente')

    if (!pagosPendientes || pagosPendientes.length === 0) {
      setGuardando(false)
      return alert('No hay pagos pendientes por ajustar para este alumno en este grupo.')
    }

    for (let pago of pagosPendientes) {
      const nuevoMonto = Number((pago.monto * (1 - descuento)).toFixed(2))
      await supabase
        .from('pagos')
        .update({ monto: nuevoMonto })
        .eq('id', pago.id)
    }

    alert(`¡Beca del ${porcentajeBeca}% aplicada con éxito a los pagos pendientes!`)
    setModalGestion(false)
    setInscripcionSeleccionada(null)
    setPorcentajeBeca('')
    setGuardando(false)
    cargarDatos()
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
    <div className="h-screen flex overflow-hidden bg-slate-950 font-sans text-slate-100">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900/90 backdrop-blur-xl text-slate-300 hidden lg:flex flex-col border-r border-slate-800/80 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-lg shadow-indigo-500/20">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight">Espiritistas a Cantar</span>
              <span className="text-[11px] text-indigo-400 font-medium tracking-wide">Panel Administrativo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto text-sm font-medium">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-semibold shadow-inner">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/60 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950">
        
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-lg shadow-black/20">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Inscripciones y Bajas</h2>
            <p className="text-xs text-slate-400 mt-0.5">Gestiona las matrículas y los accesos de tus estudiantes con precisión</p>
          </div>
          <button 
            onClick={() => setModalNuevaInscripcion(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 transition duration-200 flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Nueva Inscripción
          </button>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-6">
          
          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4 transition focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <span className="text-slate-400 text-lg pl-3">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre del estudiante, curso o grupo..." 
              className="w-full text-sm outline-none bg-transparent text-slate-100 placeholder-slate-500 font-medium"
            />
          </div>

          {/* TABLA DE INSCRIPCIONES */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-900/40">
              <h3 className="text-base font-extrabold text-white tracking-wide">
                Listado de Inscripciones <span className="text-indigo-400 ml-1 font-mono">({inscripcionesFiltradas.length})</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-20 text-sm font-medium text-slate-500 animate-pulse">Cargando la información...</div>
              ) : inscripcionesFiltradas.length === 0 ? (
                <div className="text-center py-20 text-sm font-medium text-slate-500">No hay inscripciones registradas que coincidan con tu búsqueda.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/20">
                      <th className="py-4 px-6">Estudiante</th>
                      <th className="py-4 px-6">Curso / Grupo</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right">Precio / Cuotas</th>
                      <th className="py-4 px-6 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm text-slate-300">
                    {inscripcionesFiltradas.map((ins) => (
                      <tr key={ins.id} className="hover:bg-slate-800/40 transition duration-150">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white mb-0.5">{ins.alumnoNombre}</div>
                          <span className="text-xs text-slate-400">{ins.alumnoCorreo}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-200 mb-1">{ins.cursoNombre}</div>
                          <span className="text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-bold px-2.5 py-1 rounded-lg">
                            {ins.grupoNombre}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {ins.estatus === 'activa' ? (
                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5 w-max">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Activa
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-full shadow-sm flex items-center gap-1.5 w-max" title={ins.motivo_baja}>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Baja
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right font-mono">
                          <div className="font-bold text-white mb-0.5">$ {Number(ins.costoTotal).toLocaleString('es-MX')} MXN</div>
                          <span className="text-xs text-slate-400">{ins.numPagos} pago(s)</span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button 
                            onClick={() => {
                              setInscripcionSeleccionada(ins)
                              setTipoAjuste(ins.estatus === 'baja' ? 'reactivar' : 'baja')
                              setModalGestion(true)
                            }}
                            className="bg-slate-800/80 border border-slate-700/80 hover:bg-indigo-600/20 hover:border-indigo-500/50 hover:text-indigo-300 text-slate-300 font-bold px-4 py-2 rounded-xl transition text-xs flex items-center gap-2 mx-auto shadow-sm"
                          >
                            <span>⚙️</span> Gestionar
                          </button>
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

      {/* MODAL NUEVA INSCRIPCIÓN */}
      {modalNuevaInscripcion && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-5">
              <div>
                <h3 className="text-xl font-black text-white">Nueva Inscripción</h3>
                <p className="text-xs text-slate-400 mt-0.5">Selecciona al estudiante y el curso correspondiente para matricularlo.</p>
              </div>
              <button onClick={() => setModalNuevaInscripcion(false)} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition flex items-center justify-center">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">1. Buscar Estudiante</h4>
                <input 
                  type="text" 
                  value={busquedaAlumno}
                  onChange={(e) => setBusquedaAlumno(e.target.value)}
                  placeholder="Escribe el nombre aquí..."
                  className="w-full p-3.5 border border-slate-800 rounded-xl text-sm bg-slate-900 text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition placeholder-slate-500"
                />

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {alumnosFiltradosModal.map(a => {
                    const nombreAl = a.nombre || a.Nombre || 'Estudiante'
                    const estaSeleccionado = alumnoSeleccionado?.id === a.id

                    return (
                      <div 
                        key={a.id} 
                        onClick={() => setAlumnoSeleccionado(a)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center shadow-sm ${estaSeleccionado ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 font-bold ring-2 ring-indigo-500/20' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'}`}
                      >
                        <div>
                          <div className="text-sm">{nombreAl}</div>
                          <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">#{a.matricula || `EAC-${a.id}`}</span>
                        </div>
                        {estaSeleccionado && <span className="text-indigo-400 text-xs font-bold bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/30">✓ Seleccionado</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">2. Asignar Curso y Grupo</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Curso o Programa Madre</label>
                    <select 
                      value={cursoSeleccionado?.id || ''}
                      onChange={(e) => {
                        const cur = cursos.find(c => String(c.id) === String(e.target.value))
                        setCursoSeleccionado(cur || null)
                        setGrupoSeleccionado(null)
                      }}
                      className="w-full p-3.5 border border-slate-800 rounded-xl text-sm bg-slate-900 text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition cursor-pointer"
                    >
                      <option value="">Seleccione un curso...</option>
                      {cursos.map(c => (
                        <option key={c.id} value={c.id}>{c.Nombre_curso || c.nombre_curso}</option>
                      ))}
                    </select>
                  </div>

                  {cursoSeleccionado && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Grupo / Horario</label>
                      <select 
                        value={grupoSeleccionado?.id || ''}
                        onChange={(e) => {
                          const gr = grupos.find(g => String(g.id) === String(e.target.value))
                          setGrupoSeleccionado(gr || null)
                        }}
                        className="w-full p-3.5 border border-slate-800 rounded-xl text-sm bg-slate-900 text-slate-100 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition cursor-pointer"
                      >
                        <option value="">Seleccione grupo y costo...</option>
                        {gruposDelCursoSeleccionado.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.nombre_grupo} — ${Number(g.costo_total).toLocaleString('es-MX')} MXN ({g.num_pagos} pagos {g.frecuencia})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {grupoSeleccionado && (
                    <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="font-extrabold text-indigo-300 text-xs mb-2 flex items-center gap-2">
                        <span>💰</span> Resumen Financiero del Grupo:
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-indigo-500/20 pb-2">
                        <span className="text-slate-400">Costo Total:</span>
                        <span className="font-bold text-white">$ {Number(grupoSeleccionado.costo_total).toLocaleString('es-MX')} MXN</span>
                      </div>
                      <div className="flex justify-between items-center text-xs pt-0.5">
                        <span className="text-slate-400">Plan de Pagos:</span>
                        <span className="font-bold text-white text-right font-mono">
                          {grupoSeleccionado.num_pagos} pagos de $ {(Number(grupoSeleccionado.costo_total) / Number(grupoSeleccionado.num_pagos)).toFixed(2)} MXN
                          <span className="block text-[10px] text-indigo-400 font-sans font-normal capitalize">({grupoSeleccionado.frecuencia})</span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>

            <div className="flex justify-end gap-3 pt-5 border-t border-slate-800">
              <button type="button" onClick={() => setModalNuevaInscripcion(false)} className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition">Cancelar</button>
              <button 
                type="button" 
                disabled={guardando || !alumnoSeleccionado || !cursoSeleccionado || !grupoSeleccionado}
                onClick={confirmarInscripcionModal}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:shadow-none"
              >
                {guardando ? 'Inscribiendo...' : 'Confirmar e Inscribir Estudiante'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL GESTIÓN: BAJA, REACTIVACIÓN O BECAS */}
      {modalGestion && inscripcionSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-800 space-y-6">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Gestionar Estudiante</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">{inscripcionSeleccionada.alumnoNombre} <span className="mx-1.5 opacity-50">|</span> <span className="text-indigo-400 font-bold">{inscripcionSeleccionada.cursoNombre}</span></p>
              </div>
              <button onClick={() => setModalGestion(false)} className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition flex items-center justify-center">✕</button>
            </div>

            <div className="flex bg-slate-950 p-1.5 rounded-2xl text-xs font-bold gap-1 border border-slate-800">
              {inscripcionSeleccionada.estatus === 'baja' ? (
                <button 
                  onClick={() => setTipoAjuste('reactivar')} 
                  className={`flex-1 py-2.5 rounded-xl transition ${tipoAjuste === 'reactivar' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  🟢 Reincorporar
                </button>
              ) : (
                <button 
                  onClick={() => setTipoAjuste('baja')} 
                  className={`flex-1 py-2.5 rounded-xl transition ${tipoAjuste === 'baja' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  🔴 Dar de Baja
                </button>
              )}
              <button 
                onClick={() => setTipoAjuste('beca')} 
                className={`flex-1 py-2.5 rounded-xl transition ${tipoAjuste === 'beca' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
              >
                🎓 Aplicar Beca
              </button>
            </div>

            {tipoAjuste === 'reactivar' ? (
              <div className="space-y-5 text-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl text-emerald-200 space-y-1.5 shadow-sm text-xs">
                  <span className="font-extrabold flex items-center gap-1.5 text-emerald-400">✅ Reincorporar Estudiante:</span>
                  <p className="leading-relaxed opacity-90">Al reactivar su inscripción, el sistema restaurará sus cuotas pendientes para que pueda continuar con su plan de pagos, conservando intacto el historial de lo que ya abonó anteriormente.</p>
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button onClick={() => setModalGestion(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition">Cancelar</button>
                  <button 
                    disabled={guardando}
                    onClick={procesarReactivacionInscripcion}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/30"
                  >
                    {guardando ? 'Reactivando...' : 'Confirmar Reincorporación'}
                  </button>
                </div>
              </div>
            ) : tipoAjuste === 'baja' ? (
              <div className="space-y-5 text-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-rose-200 space-y-1.5 shadow-sm text-xs">
                  <span className="font-extrabold flex items-center gap-1.5 text-rose-400">⚠️ Aviso importante:</span>
                  <p className="leading-relaxed opacity-90">Al dar de baja al alumno, sus cuotas pendientes se anularán (pasarás sus montos a $0 y estatus cancelado) para que su saldo quede en cero. Su historial de pagos previos se conservará.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-400 uppercase text-[10px] tracking-wider">Motivo de la baja (Opcional)</label>
                  <input 
                    type="text"
                    value={motivoBaja}
                    onChange={(e) => setMotivoBaja(e.target.value)}
                    placeholder="Ej. Motivos personales, falta de pago..."
                    className="w-full p-3.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition text-xs placeholder-slate-600"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button onClick={() => setModalGestion(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition">Cancelar</button>
                  <button 
                    disabled={guardando}
                    onClick={procesarBajaInscripcion}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-rose-600/30"
                  >
                    {guardando ? 'Procesando...' : 'Confirmar Baja'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 text-sm animate-in fade-in slide-in-from-bottom-2">
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl text-indigo-200 space-y-1.5 shadow-sm text-xs">
                  <span className="font-extrabold flex items-center gap-1.5 text-indigo-400">💎 Aplicar Descuento / Beca:</span>
                  <p className="leading-relaxed opacity-90">El porcentaje que ingreses se aplicará automáticamente reduciendo el costo de <strong>todas las cuotas</strong> que aún se encuentren con estatus Pendiente.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-400 uppercase text-[10px] tracking-wider">Porcentaje de Descuento (%)</label>
                  <input 
                    type="number"
                    value={porcentajeBeca}
                    onChange={(e) => setPorcentajeBeca(e.target.value)}
                    placeholder="Ej. 20 (para 20%)"
                    className="w-full p-3.5 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition text-base font-bold placeholder-slate-600"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button onClick={() => setModalGestion(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800 rounded-xl transition">Cancelar</button>
                  <button 
                    disabled={guardando || !porcentajeBeca}
                    onClick={procesarBecaInscripcion}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {guardando ? 'Aplicando...' : 'Aplicar Beca'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
