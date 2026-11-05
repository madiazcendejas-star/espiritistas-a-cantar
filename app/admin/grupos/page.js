'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function GruposAdminPage() {
  const [grupos, setGrupos] = useState([])
  const [cursos, setCursos] = useState([])
  const [inscripciones, setInscripciones] = useState([])
  const [alumnos, setAlumnos] = useState([])
  const [recursos, setRecursos] = useState([])
  const [sesionesGrupo, setSesionesGrupo] = useState([])
  const [pagos, setPagos] = useState([])
  const [valoraciones, setValoraciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [ocultarFinalizados, setOcultarFinalizados] = useState(false)

  // Modales
  const [modalGrupo, setModalGrupo] = useState(false)
  const [modalDetalle, setModalDetalle] = useState(false)
  const [grupoSeleccionado, setGrupoSeleccionado] = useState(null)
  const [pestanaActiva, setPestanaActiva] = useState('detalles')
  const [guardando, setGuardando] = useState(false)

  // Modal para editar / reprogramar sesión individual
  const [modalSesionEdit, setModalSesionEdit] = useState(false)
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null)
  const [formEditarSesion, setFormEditarSesion] = useState({
    titulo_sesion: '',
    fecha_hora: '',
    enlace_meet: '',
    reprogramar_pago: false
  })

  // Formulario Nuevo Grupo (Con num_pagos y frecuencia funcionales)
  const [formGrupo, setFormGrupo] = useState({
    curso_id: '',
    nombre_grupo: '',
    tipo_modalidad: 'en_linea',
    capacidad: 15,
    cuota_inscripcion: '',
    costo_total: '',
    num_pagos: 1,
    frecuencia: 'mensual',
    fecha_inicio: '',
    fecha_fin: '',
    horario_texto: 'Lunes y Miércoles 18:00 - 20:00',
    enlace_whatsapp: ''
  })

  // Estado para editar capacidad, fechas y datos del grupo seleccionado
  const [capacidadEditada, setCapacidadEditada] = useState(15)
  const [fechaInicioEditada, setFechaInicioEditada] = useState('')
  const [fechaFinEditada, setFechaFinEditada] = useState('')
  const [enlaceWhatsappEditado, setEnlaceWhatsappEditado] = useState('')
  const [infoCopiarEditada, setInfoCopiarEditada] = useState('')
  const [guardandoInfo, setGuardandoInfo] = useState(false)

  // Formulario Recurso
  const [formRecurso, setFormRecurso] = useState({ titulo: '', tipo: 'video', url: '' })

  // Formulario Sesión
  const [formSesion, setFormSesion] = useState({
    numero_sesion: 1,
    titulo_sesion: '',
    fecha_hora: '',
    enlace_meet: ''
  })

  // Ajuste masivo de pagos
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
    const { data: resIns } = await supabase.from('inscripciones').select('*')
    const { data: resAlumnos } = await supabase.from('alumnos').select('*')
    const { data: resRecursos } = await supabase.from('recursos').select('*')
    const { data: resSesiones } = await supabase.from('sesiones_grupo').select('*').order('fecha_hora', { ascending: true })
    const { data: resPagos } = await supabase.from('pagos').select('*')
    const { data: resVal } = await supabase.from('valoraciones').select('*')

    if (resGrupos) setGrupos(resGrupos)
    if (resCursos) setCursos(resCursos)
    if (resIns) setInscripciones(resIns)
    if (resAlumnos) setAlumnos(resAlumnos)
    if (resRecursos) setRecursos(resRecursos)
    if (resSesiones) setSesionesGrupo(resSesiones)
    if (resPagos) setPagos(resPagos)
    if (resVal) setValoraciones(resVal)
    setLoading(false)
  }

  // CREAR GRUPO Y GENERAR PLAN DE PAGOS AUTOMÁTICO SI APLICA
  const crearGrupo = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const costoTotalNum = Number(formGrupo.costo_total) || 0
    const numPagosNum = Number(formGrupo.num_pagos) || 1

    const { data: grupoCreado, error } = await supabase.from('grupos').insert([{
      curso_id: Number(formGrupo.curso_id),
      nombre_grupo: formGrupo.nombre_grupo.trim(),
      tipo_modalidad: formGrupo.tipo_modalidad,
      capacidad: Number(formGrupo.capacidad) || 15,
      cuota_inscripcion: Number(formGrupo.cuota_inscripcion) || 0,
      costo_total: costoTotalNum,
      num_pagos: numPagosNum,
      frecuencia: formGrupo.frecuencia,
      fecha_inicio: formGrupo.fecha_inicio || null,
      fecha_fin: formGrupo.fecha_fin || null,
      horario_texto: formGrupo.horario_texto.trim(),
      enlace_whatsapp: formGrupo.enlace_whatsapp.trim()
    }]).select().single()

    if (error) {
      alert('Error al crear grupo: ' + error.message)
    } else {
      setModalGrupo(false)
      setFormGrupo({
        curso_id: '',
        nombre_grupo: '',
        tipo_modalidad: 'en_linea',
        capacidad: 15,
        cuota_inscripcion: '',
        costo_total: '',
        num_pagos: 1,
        frecuencia: 'mensual',
        fecha_inicio: '',
        fecha_fin: '',
        horario_texto: '',
        enlace_whatsapp: ''
      })
      cargarDatos()
      alert('¡Grupo creado exitosamente con su esquema de pagos configurado!')
    }
    setGuardando(false)
  }

  const actualizarFechasYCapacidad = async (e) => {
    e.preventDefault()
    if (!grupoSeleccionado) return

    const { error } = await supabase
      .from('grupos')
      .update({ 
        capacidad: Number(capacidadEditada),
        fecha_inicio: fechaInicioEditada || null,
        fecha_fin: fechaFinEditada || null
      })
      .eq('id', grupoSeleccionado.id)

    if (error) {
      alert('Error al actualizar datos del grupo: ' + error.message)
    } else {
      alert('¡Configuración guardada con éxito!')
      setGrupoSeleccionado({ 
        ...grupoSeleccionado, 
        capacidad: Number(capacidadEditada),
        fecha_inicio: fechaInicioEditada,
        fecha_fin: fechaFinEditada
      })
      cargarDatos()
    }
  }

  const actualizarEnlaceWhatsapp = async (e) => {
    e.preventDefault()
    if (!grupoSeleccionado) return
    
    const { error } = await supabase
      .from('grupos')
      .update({ enlace_whatsapp: enlaceWhatsappEditado })
      .eq('id', grupoSeleccionado.id)

    if (error) {
      alert('Error al guardar el enlace: ' + error.message)
    } else {
      alert('¡Enlace guardado con éxito!')
      setGrupoSeleccionado({ ...grupoSeleccionado, enlace_whatsapp: enlaceWhatsappEditado })
      cargarDatos()
    }
  }

  const actualizarInfoCopiar = async (e) => {
    e.preventDefault()
    if (!grupoSeleccionado) return
    setGuardandoInfo(true)

    const { error } = await supabase
      .from('grupos')
      .update({ info_copiar: infoCopiarEditada })
      .eq('id', grupoSeleccionado.id)

    if (error) {
      alert('Error al guardar la información para WhatsApp: ' + error.message)
    } else {
      alert('¡Información para WhatsApp guardada con éxito!')
      setGrupoSeleccionado({ ...grupoSeleccionado, info_copiar: infoCopiarEditada })
      cargarDatos()
    }
    setGuardandoInfo(false)
  }

  const copiarAlPortapapeles = (texto) => {
    if (!texto) return alert('No hay información escrita para copiar.')
    navigator.clipboard.writeText(texto)
    alert('¡Copiado al portapapeles!')
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

  const darDeBajaAlumno = async (inscripcionId, alumnoId) => {
    if (!confirm('¿Estás seguro de DAR DE BAJA a este alumno? Perderá el acceso y se cancelarán sus cobros futuros.')) return
    setLoading(true)

    const { error: errIns } = await supabase
      .from('inscripciones')
      .update({ estatus: 'baja' })
      .eq('id', inscripcionId)

    if (errIns) {
      alert('Error al actualizar inscripción: ' + errIns.message)
      setLoading(false)
      return
    }

    const hoy = new Date().toISOString().split('T')[0]
    const { data: pagosCancelar } = await supabase.from('pagos').select('*')
      .eq('alumno_id', alumnoId)
      .eq('grupo_id', grupoSeleccionado.id)
      .eq('estatus', 'Pendiente')
      .gte('fecha_vencimiento', hoy)

    for (let p of (pagosCancelar || [])) {
      await supabase.from('pagos').update({ estatus: 'Cancelado', monto: 0 }).eq('id', p.id)
    }

    alert('Alumno dado de baja correctamente.')
    cargarDatos()
  }

  // AGREGAR SESIÓN CON HORA LOCAL CORRECTA (EVITA DESFASE UTC)
  const agregarSesionAGrupo = async (e) => {
    e.preventDefault()
    if (!formSesion.titulo_sesion.trim() || !formSesion.fecha_hora) return alert('Completa los campos de la sesión.')

    const { error } = await supabase.from('sesiones_grupo').insert([{
      grupo_id: grupoSeleccionado.id,
      numero_sesion: Number(formSesion.numero_sesion),
      titulo_sesion: formSesion.titulo_sesion.trim(),
      fecha_hora: formSesion.fecha_hora, // Formato datetime-local nativo
      enlace_meet: formSesion.enlace_meet.trim() || null
    }])

    if (error) {
      alert('Error al programar sesión: ' + error.message)
    } else {
      const sesionesActuales = sesionesGrupo.filter(s => s.grupo_id === grupoSeleccionado.id)
      setFormSesion({ numero_sesion: sesionesActuales.length + 2, titulo_sesion: '', fecha_hora: '', enlace_meet: '' })
      cargarDatos()
      alert('¡Sesión programada con éxito!')
    }
  }

  // REPROGRAMAR SESIÓN Y LIGAR AL CALENDARIO DE PAGOS
  const guardarEdicionSesion = async (e) => {
    e.preventDefault()
    if (!sesionSeleccionada) return

    const fechaAntigua = new Date(sesionSeleccionada.fecha_hora)
    const fechaNueva = new Date(formEditarSesion.fecha_hora)

    const { error } = await supabase
      .from('sesiones_grupo')
      .update({
        titulo_sesion: formEditarSesion.titulo_sesion.trim(),
        fecha_hora: formEditarSesion.fecha_hora,
        enlace_meet: formEditarSesion.enlace_meet.trim() || null
      })
      .eq('id', sesionSeleccionada.id)

    if (error) {
      alert('Error al actualizar la sesión: ' + error.message)
      return
    }

    // Si se marcó reprogramar pago en cadena por diferencia de días
    if (formEditarSesion.reprogramar_pago) {
      const diffDias = Math.round((fechaNueva - fechaAntigua) / (1000 * 60 * 60 * 24))
      if (diffDias !== 0) {
        const fechaStrOriginal = sesionSeleccionada.fecha_hora.split('T')[0]
        const { data: pgs } = await supabase
          .from('pagos')
          .select('*')
          .eq('grupo_id', grupoSeleccionado.id)
          .eq('estatus', 'Pendiente')
          .gte('fecha_vencimiento', fechaStrOriginal)

        let count = 0
        for (let p of (pgs || [])) {
          const f = new Date(p.fecha_vencimiento)
          f.setDate(f.getDate() + diffDias)
          await supabase.from('pagos').update({ fecha_vencimiento: f.toISOString().split('T')[0] }).eq('id', p.id)
          count++
        }
        alert(`¡Sesión reprogramada y ${count} pagos pendientes ajustados en automático!`)
      } else {
        alert('¡Sesión actualizada con éxito!')
      }
    } else {
      alert('¡Sesión actualizada con éxito!')
    }

    setModalSesionEdit(false)
    setSesionSeleccionada(null)
    cargarDatos()
  }

  const eliminarSesion = async (idSesion) => {
    if (!confirm('¿Eliminar esta sesión?')) return
    const { error } = await supabase.from('sesiones_grupo').delete().eq('id', idSesion)
    if (!error) cargarDatos()
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
      alert('Error al agregar material: ' + error.message)
    } else {
      setFormRecurso({ titulo: '', tipo: 'video', url: '' })
      cargarDatos()
      alert('¡Material agregado con éxito!')
    }
  }

  const eliminarRecurso = async (idRecurso) => {
    const { error } = await supabase.from('recursos').delete().eq('id', idRecurso)
    if (!error) cargarDatos()
  }

  const totalGrupos = grupos.length
  const totalInscripcionesConfirmadas = inscripciones.filter(i => i.estatus === 'activa' || !i.estatus).length
  const totalInscripcionesPorConfirmar = inscripciones.filter(i => i.estatus === 'Revision' || i.estatus === 'pendiente').length
  
  const plazasTotales = grupos.reduce((acc, g) => acc + (Number(g.capacidad) || 15), 0)
  const plazasDisponibles = Math.max(0, plazasTotales - totalInscripcionesConfirmadas)
  const tasaOcupacion = plazasTotales > 0 ? Math.round((totalInscripcionesConfirmadas / plazasTotales) * 100) : 0

  const gruposFiltrados = grupos.filter(g => {
    const cursoAsociado = cursos.find(c => Number(c.id) === Number(g.curso_id))
    const nombreCurso = cursoAsociado?.Nombre_curso || cursoAsociado?.nombre_curso || ''
    const coincide = g.nombre_grupo.toLowerCase().includes(busqueda.toLowerCase()) || nombreCurso.toLowerCase().includes(busqueda.toLowerCase())
    
    if (ocultarFinalizados && g.fecha_fin && new Date(g.fecha_fin) < new Date()) {
      return false
    }
    return coincide
  })

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR MODERNO */}
      <aside className="w-64 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/80 z-20 flex-shrink-0">
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
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🏛️ Grupos</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Gestión de Grupos y Horarios</h2>
            <p className="text-[11px] text-slate-500">Administra cupos, sesiones, materiales y planes de pago</p>
          </div>
          <button onClick={() => setModalGrupo(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2">
            <span>+</span> Nuevo Grupo
          </button>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* TARJETAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Grupos</span>
              <div className="text-2xl font-black text-slate-900">{totalGrupos}</div>
              <span className="text-[11px] text-slate-500">{totalGrupos} activos en total</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inscripciones Confirmadas</span>
              <div className="text-2xl font-black text-indigo-600">{totalInscripcionesConfirmadas}</div>
              <span className="text-[11px] text-slate-500">Alumnos activos con acceso</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Por Confirmar</span>
              <div className="text-2xl font-black text-amber-500">{totalInscripcionesPorConfirmar}</div>
              <span className="text-[11px] text-slate-500">Pendientes de validación</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plazas Disponibles</span>
              <div className="text-2xl font-black text-emerald-600">{plazasDisponibles}</div>
              <span className="text-[11px] text-slate-500">De {plazasTotales} plazas totales</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tasa de Ocupación</span>
              <div className="text-2xl font-black text-slate-900">{tasaOcupacion}%</div>
              <span className="text-[11px] text-slate-500">{totalInscripcionesConfirmadas} de {plazasTotales} ocupadas</span>
            </div>
          </div>

          {/* BUSCADOR Y FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full">
              <span className="text-slate-400 text-sm pl-2">🔍</span>
              <input 
                type="text" 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar grupos por nombre o curso..." 
                className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer whitespace-nowrap font-medium">
                <input 
                  type="checkbox" 
                  checked={ocultarFinalizados} 
                  onChange={(e) => setOcultarFinalizados(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Ocultar finalizados
              </label>
            </div>
          </div>

          {/* LISTA DE TARJETAS DE GRUPOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {gruposFiltrados.map((g) => {
              const cursoAsociado = cursos.find(c => Number(c.id) === Number(g.curso_id))
              const nombreCurso = cursoAsociado?.Nombre_curso || cursoAsociado?.nombre_curso || 'Curso General'
              const inscritosGrupo = inscripciones.filter(i => Number(i.grupo_id) === Number(g.id) && (i.estatus === 'activa' || !i.estatus)).length
              const capacidadGrupo = Number(g.capacidad) || 15
              const ocupacionGrupo = Math.round((inscritosGrupo / capacidadGrupo) * 100)

              return (
                <div 
                  key={g.id} 
                  onClick={() => { 
                    setGrupoSeleccionado(g); 
                    setCapacidadEditada(g.capacidad || 15);
                    setFechaInicioEditada(g.fecha_inicio || '');
                    setFechaFinEditada(g.fecha_fin || '');
                    setInfoCopiarEditada(g.info_copiar || '');
                    setEnlaceWhatsappEditado(g.enlace_whatsapp || '');
                    setPestanaActiva('detalles'); 
                    setModalDetalle(true); 
                  }}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between cursor-pointer hover:border-indigo-400 hover:shadow-md transition group"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {nombreCurso}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition">{g.nombre_grupo}</h4>
                    <p className="text-xs text-slate-500 truncate">
                      {g.fecha_inicio ? `Del ${g.fecha_inicio} al ${g.fecha_fin || 'Indefinido'}` : (g.horario_texto || 'Sin horario definido')}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{inscritosGrupo} / {capacidadGrupo} cupos</span>
                      <span className={`font-bold ${ocupacionGrupo >= 90 ? 'text-rose-600' : 'text-emerald-600'}`}>{ocupacionGrupo}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${ocupacionGrupo >= 90 ? 'bg-rose-500' : 'bg-indigo-600'}`} style={{ width: `${Math.min(100, ocupacionGrupo)}%` }}></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* MODAL NUEVO GRUPO (CON CONFIGURACIÓN DE CUOTAS Y PAGOS) */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Crear Nuevo Grupo y Esquema de Pagos</h3>
              <button onClick={() => setModalGrupo(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">✕</button>
            </div>
            <form onSubmit={crearGrupo} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Seleccionar Curso *</label>
                <select 
                  required
                  value={formGrupo.curso_id}
                  onChange={(e) => setFormGrupo({ ...formGrupo, curso_id: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-500"
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
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Modalidad</label>
                  <select 
                    value={formGrupo.tipo_modalidad}
                    onChange={(e) => setFormGrupo({ ...formGrupo, tipo_modalidad: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                  >
                    <option value="en_linea">💻 En Línea</option>
                    <option value="presencial">📍 Presencial</option>
                    <option value="hibrido">🔀 Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Capacidad (Plazas)</label>
                  <input type="number" required min="1" value={formGrupo.capacidad} onChange={(e) => setFormGrupo({ ...formGrupo, capacidad: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" />
                </div>
              </div>

              {/* SECCIÓN FINANCIERA CORREGIDA */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-1">Costo Total del Curso ($) *</label>
                  <input type="number" required placeholder="Ej. 3000" value={formGrupo.costo_total} onChange={(e) => setFormGrupo({ ...formGrupo, costo_total: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-1">Cuota Inscripción ($)</label>
                  <input type="number" placeholder="0 si no aplica" value={formGrupo.cuota_inscripcion} onChange={(e) => setFormGrupo({ ...formGrupo, cuota_inscripcion: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-1">Número de Pagos</label>
                  <input type="number" min="1" required value={formGrupo.num_pagos} onChange={(e) => setFormGrupo({ ...formGrupo, num_pagos: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-indigo-900 mb-1">Frecuencia de Cobro</label>
                  <select value={formGrupo.frecuencia} onChange={(e) => setFormGrupo({ ...formGrupo, frecuencia: e.target.value })} className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-white outline-none">
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="semanal">Semanal</option>
                    <option value="unico">Pago Único</option>
                  </select>
                </div>
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
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Horario y Período (Texto)</label>
                <input type="text" placeholder="Ej. Lun y Mié 18:00 - 20:00" value={formGrupo.horario_texto} onChange={(e) => setFormGrupo({ ...formGrupo, horario_texto: e.target.value })} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalGrupo(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Crear Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE GRUPO CON PESTAÑAS */}
      {modalDetalle && grupoSeleccionado && (() => {
        const cursoAsociado = cursos.find(c => Number(c.id) === Number(grupoSeleccionado.curso_id))
        const nombreCurso = cursoAsociado?.Nombre_curso || cursoAsociado?.nombre_curso || 'Curso General'
        const inscritosGrupo = inscripciones.filter(i => Number(i.grupo_id) === Number(grupoSeleccionado.id))
        const confirmados = inscritosGrupo.filter(i => i.estatus === 'activa' || !i.estatus).length
        const capacidad = Number(grupoSeleccionado.capacidad) || 15
        const ocupacion = Math.round((confirmados / capacidad) * 100)
        const sesionesDelGrupo = sesionesGrupo.filter(s => Number(s.grupo_id) === Number(grupoSeleccionado.id))
        const materialesDelGrupo = recursos.filter(r => Number(r.grupo_id) === Number(grupoSeleccionado.id))
        const valoracionesCurso = valoraciones.filter(v => Number(v.curso_id) === Number(grupoSeleccionado.curso_id))

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
              
              {/* CABECERA DEL DETALLE */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1 rounded-full uppercase">{nombreCurso}</span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">{grupoSeleccionado.nombre_grupo}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">🗓️ {grupoSeleccionado.horario_texto || 'Sin horario definido'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={eliminarGrupo} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3.5 py-2 rounded-xl text-xs font-semibold">Eliminar Grupo</button>
                  <button onClick={() => setModalDetalle(false)} className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center">✕</button>
                </div>
              </div>

              {/* NAVEGACIÓN POR PESTAÑAS */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
                <button onClick={() => setPestanaActiva('detalles')} className={`px-4 py-2 rounded-xl transition ${pestanaActiva === 'detalles' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>📄 Detalles</button>
                <button onClick={() => setPestanaActiva('inscripciones')} className={`px-4 py-2 rounded-xl transition ${pestanaActiva === 'inscripciones' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>🎓 Inscripciones ({inscritosGrupo.length})</button>
                <button onClick={() => setPestanaActiva('sesiones')} className={`px-4 py-2 rounded-xl transition ${pestanaActiva === 'sesiones' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>🗓️ Sesiones ({sesionesDelGrupo.length})</button>
                <button onClick={() => setPestanaActiva('materiales')} className={`px-4 py-2 rounded-xl transition ${pestanaActiva === 'materiales' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>📚 Materiales ({materialesDelGrupo.length})</button>
                <button onClick={() => setPestanaActiva('valoraciones')} className={`px-4 py-2 rounded-xl transition ${pestanaActiva === 'valoraciones' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 bg-amber-50 hover:bg-amber-100'}`}>⭐ Valoraciones ({valoracionesCurso.length})</button>
                <button onClick={() => setPestanaActiva('whatsapp')} className={`px-4 py-2 rounded-xl transition ${pestanaActiva === 'whatsapp' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}>💬 Info WhatsApp</button>
              </div>

              {/* PESTAÑA: DETALLES */}
              {pestanaActiva === 'detalles' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 sm:col-span-2">
                      <h4 className="text-xs font-bold uppercase text-slate-700">⚙️ Configuración y Fechas del Grupo</h4>
                      <form onSubmit={actualizarFechasYCapacidad} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Capacidad Máxima</label>
                          <input type="number" min="1" required value={capacidadEditada} onChange={(e) => setCapacidadEditada(e.target.value)} className="p-2.5 border rounded-xl text-xs bg-white w-full outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Inicio</label>
                          <input type="date" value={fechaInicioEditada} onChange={(e) => setFechaInicioEditada(e.target.value)} className="p-2.5 border rounded-xl text-xs bg-white w-full outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fecha de Fin (Cierre)</label>
                          <input type="date" value={fechaFinEditada} onChange={(e) => setFechaFinEditada(e.target.value)} className="p-2.5 border rounded-xl text-xs bg-white w-full outline-none" />
                        </div>
                        <div className="sm:col-span-3 flex justify-end">
                          <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Guardar Cambios</button>
                        </div>
                      </form>
                    </div>

                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-emerald-900">🔗 Enlace de WhatsApp</h4>
                      <form onSubmit={actualizarEnlaceWhatsapp} className="flex flex-col sm:flex-row gap-2">
                        <input type="url" placeholder="https://chat.whatsapp.com/..." value={enlaceWhatsappEditado} onChange={(e) => setEnlaceWhatsappEditado(e.target.value)} className="p-2.5 border rounded-xl text-xs bg-white w-full outline-none" />
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap">Guardar</button>
                      </form>
                    </div>

                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-slate-500">Información Financiera</h4>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                        <span className="text-slate-600">Costo total:</span>
                        <span className="font-bold text-slate-900">${Number(grupoSeleccionado.costo_total || 0).toLocaleString('es-MX')} MXN</span>
                      </div>
                      <div className="flex justify-between text-xs py-1 border-b border-slate-200">
                        <span className="text-slate-600">Esquema de pagos:</span>
                        <span className="font-bold text-indigo-600">{grupoSeleccionado.num_pagos || 1} pagos ({grupoSeleccionado.frecuencia || 'mensual'})</span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span className="text-slate-600">Inscripción:</span>
                        <span className="font-bold text-slate-900">${Number(grupoSeleccionado.cuota_inscripcion || 0).toLocaleString('es-MX')} MXN</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA: VALORACIONES */}
              {pestanaActiva === 'valoraciones' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500">⭐ Reseñas y Estrellas de este Curso</h4>
                  {valoracionesCurso.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-2xl">Aún no hay valoraciones registradas para este curso.</p>
                  ) : (
                    <div className="space-y-3">
                      {valoracionesCurso.map(val => {
                        const alumnoVal = alumnos.find(a => Number(a.id) === Number(val.alumno_id))
                        return (
                          <div key={val.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-900 text-xs">{alumnoVal?.nombre || alumnoVal?.Nombre || 'Estudiante'}</span>
                              <div className="flex text-amber-400 text-xs">
                                {[1, 2, 3, 4, 5].map((num) => (<span key={num}>{num <= val.estrellas ? '★' : '☆'}</span>))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 italic">"{val.comentario || 'Sin comentario escrito.'}"</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA: INSCRIPCIONES */}
              {pestanaActiva === 'inscripciones' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Estudiantes Inscritos a este Grupo</h4>
                  {inscritosGrupo.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 rounded-2xl">No hay estudiantes inscritos en este grupo todavía.</p>
                  ) : (
                    <div className="space-y-3">
                      {inscritosGrupo.map(ins => {
                        const alumno = alumnos.find(a => Number(a.id) === Number(ins.alumno_id))
                        const estaDeBaja = ins.estatus?.toLowerCase() === 'baja'
                        const pagosAlumno = pagos.filter(p => Number(p.alumno_id) === Number(ins.alumno_id) && Number(p.grupo_id) === Number(grupoSeleccionado.id))
                        const pendientes = pagosAlumno.filter(p => p.estatus?.toLowerCase() === 'pendiente' || p.estatus?.toLowerCase() === 'vencido')
                        const tieneVencidos = pendientes.some(p => new Date(p.fecha_vencimiento) < new Date())

                        return (
                          <div key={ins.id} className={`p-4 rounded-2xl border flex justify-between items-center text-xs ${estaDeBaja ? 'bg-slate-100 opacity-60' : 'bg-slate-50'}`}>
                            <div>
                              <strong className="text-slate-900 block text-sm">{alumno?.nombre || alumno?.Nombre || 'Estudiante'}</strong>
                              <span className="text-slate-500">📧 {alumno?.correo || 'Sin correo'} · 📞 {alumno?.telefono || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {estaDeBaja ? <span className="px-3 py-1 rounded-full text-slate-500 bg-slate-200 font-bold">BAJA</span> : (
                                <>
                                  <span className={`px-3 py-1 rounded-full font-bold ${tieneVencidos ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {tieneVencidos ? 'Pago Vencido' : 'Al Corriente'}
                                  </span>
                                  <button onClick={() => darDeBajaAlumno(ins.id, alumno.id)} className="bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white px-3 py-1.5 rounded-xl transition font-semibold ml-2">Dar de baja</button>
                                </>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* PESTAÑA: SESIONES (CON REPROGRAMACIÓN Y LIGA A PAGOS) */}
              {pestanaActiva === 'sesiones' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Programar Sesiones de Clase</h4>
                  <form onSubmit={agregarSesionAGrupo} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                    <input type="number" required placeholder="Nº Sesión" value={formSesion.numero_sesion} onChange={(e) => setFormSesion({ ...formSesion, numero_sesion: e.target.value })} className="p-3 border rounded-xl text-xs bg-white" />
                    <input type="text" required placeholder="Título (Ej. Clase 1)" value={formSesion.titulo_sesion} onChange={(e) => setFormSesion({ ...formSesion, titulo_sesion: e.target.value })} className="p-3 border rounded-xl text-xs bg-white" />
                    <input type="datetime-local" required value={formSesion.fecha_hora} onChange={(e) => setFormSesion({ ...formSesion, fecha_hora: e.target.value })} className="p-3 border rounded-xl text-xs bg-white" />
                    <input type="text" placeholder="Enlace Meet o Salón" value={formSesion.enlace_meet} onChange={(e) => setFormSesion({ ...formSesion, enlace_meet: e.target.value })} className="p-3 border rounded-xl text-xs bg-white" />
                    <button type="submit" className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-semibold">+ Programar Sesión</button>
                  </form>

                  <div className="space-y-2 pt-2">
                    {sesionesDelGrupo.length === 0 ? <p className="text-xs text-slate-400 italic">No hay clases programadas.</p> : (
                      sesionesDelGrupo.map(ses => (
                        <div key={ses.id} className="p-3.5 bg-white rounded-xl border flex justify-between items-center text-xs shadow-xs">
                          <div>
                            <strong>Sesión {ses.numero_sesion}: {ses.titulo_sesion}</strong>
                            <p className="text-[11px] text-slate-500">🕒 {new Date(ses.fecha_hora).toLocaleString('es-MX')} {ses.enlace_meet ? `· 🔗 ${ses.enlace_meet}` : ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => {
                              setSesionSeleccionada(ses)
                              setFormEditarSesion({
                                titulo_sesion: ses.titulo_sesion,
                                fecha_hora: ses.fecha_hora ? ses.fecha_hora.slice(0, 16) : '',
                                enlace_meet: ses.enlace_meet || '',
                                reprogramar_pago: false
                              })
                              setModalSesionEdit(true)
                            }} className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100">Reprogramar</button>
                            <button onClick={() => eliminarSesion(ses.id)} className="text-rose-600 font-bold px-2">✕</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA: MATERIALES */}
              {pestanaActiva === 'materiales' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-slate-500">Subir Material Didáctico (Videos o PDFs)</h4>
                  <form onSubmit={agregarRecursoAGrupo} className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <input type="text" required placeholder="Título del Material" value={formRecurso.titulo} onChange={(e) => setFormRecurso({ ...formRecurso, titulo: e.target.value })} className="p-3 border rounded-xl text-xs bg-white" />
                    <select value={formRecurso.tipo} onChange={(e) => setFormRecurso({ ...formRecurso, tipo: e.target.value })} className="p-3 border rounded-xl text-xs bg-white">
                      <option value="video">Video / Clase</option>
                      <option value="pdf">Documento PDF</option>
                    </select>
                    <input type="url" required placeholder="URL (YouTube, Drive...)" value={formRecurso.url} onChange={(e) => setFormRecurso({ ...formRecurso, url: e.target.value })} className="p-3 border rounded-xl text-xs bg-white" />
                    <button type="submit" className="sm:col-span-3 bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold">+ Agregar Material al Grupo</button>
                  </form>
                  <div className="space-y-2 pt-2">
                    {materialesDelGrupo.length === 0 ? <p className="text-xs text-slate-400 italic">No hay materiales subidos.</p> : (
                      materialesDelGrupo.map(rec => (
                        <div key={rec.id} className="p-3 bg-white rounded-xl border flex justify-between items-center text-xs">
                          <div><strong>{rec.titulo}</strong><span className="text-[10px] text-indigo-600 block uppercase">{rec.tipo}</span></div>
                          <button onClick={() => eliminarRecurso(rec.id)} className="text-rose-600 font-bold">Eliminar</button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA: WHATSAPP */}
              {pestanaActiva === 'whatsapp' && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 space-y-1">
                    <h4 className="text-xs font-bold uppercase text-emerald-900">💬 Copy Informativo para tu Comunidad</h4>
                    <p className="text-[11px] text-emerald-700">Texto completo para enviar o publicar en los chats de WhatsApp.</p>
                  </div>
                  <form onSubmit={actualizarInfoCopiar} className="space-y-3">
                    <textarea rows="8" value={infoCopiarEditada} onChange={(e) => setInfoCopiarEditada(e.target.value)} placeholder="Ej. 🎶 *¡Inscripciones Abiertas!*..." className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none font-mono"></textarea>
                    <div className="flex justify-between">
                      <button type="button" onClick={() => copiarAlPortapapeles(infoCopiarEditada)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm">📋 Copiar Texto</button>
                      <button type="submit" disabled={guardandoInfo} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">💾 Guardar Cambios</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalDetalle(false)} className="px-5 py-2.5 text-xs font-semibold bg-slate-100 rounded-xl">Cerrar Ventana</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL DE REPROGRAMACIÓN DE SESIÓN INDIVIDUAL (LIGADO A PAGOS) */}
      {modalSesionEdit && sesionSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">🗓️ Reprogramar Sesión {sesionSeleccionada.numero_sesion}</h3>
            <form onSubmit={guardarEdicionSesion} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Título de la Sesión</label>
                <input type="text" required value={formEditarSesion.titulo_sesion} onChange={(e) => setFormEditarSesion({ ...formEditarSesion, titulo_sesion: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nueva Fecha y Hora</label>
                <input type="datetime-local" required value={formEditarSesion.fecha_hora} onChange={(e) => setFormEditarSesion({ ...formEditarSesion, fecha_hora: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Enlace Meet o Salón</label>
                <input type="text" value={formEditarSesion.enlace_meet} onChange={(e) => setFormEditarSesion({ ...formEditarSesion, enlace_meet: e.target.value })} className="w-full p-2.5 border rounded-xl text-xs outline-none" />
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 cursor-pointer">
                  <input type="checkbox" checked={formEditarSesion.reprogramar_pago} onChange={(e) => setFormEditarSesion({ ...formEditarSesion, reprogramar_pago: e.target.checked })} className="rounded text-indigo-600" />
                  Sincronizar con calendario de pagos
                </label>
                <p className="text-[10px] text-indigo-700">Moverá en automático los vencimientos de pagos pendientes la misma cantidad de días que se aplazó la clase.</p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalSesionEdit(false)} className="px-4 py-2 text-xs text-slate-500 font-semibold">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
