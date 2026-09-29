'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

function DetalleContenido() {
  const searchParams = useSearchParams()
  const alumnoId = searchParams.get('id')

  const [alumno, setAlumno] = useState(null)
  const [inscripciones, setInscripciones] = useState([])
  const [pagos, setPagos] = useState([])
  const [cursos, setCursos] = useState([])
  const [anotaciones, setAnotaciones] = useState([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [loading, setLoading] = useState(true)
  const [tabActiva, setTabActiva] = useState('resumen')

  // Estado para editar información personal
  const [editandoPersonal, setEditandoPersonal] = useState(false)
  const [formPersonal, setFormPersonal] = useState({})

  useEffect(() => {
    if (alumnoId) {
      cargarExpedienteCompleto()
    }
  }, [alumnoId])

  const cargarExpedienteCompleto = async () => {
    setLoading(true)

    const { data: alumnoData } = await supabase
      .from('alumnos')
      .select('*')
      .eq('id', alumnoId)
      .single()

    if (alumnoData) {
      setAlumno(alumnoData)
      setFormPersonal(alumnoData)
    }

    const { data: insData } = await supabase
      .from('inscripciones')
      .select('*')
      .eq('alumno_id', alumnoId)
    setInscripciones(insData || [])

    const { data: pgsData } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('fecha_vencimiento', { ascending: false })
    setPagos(pgsData || [])

    const { data: crsData } = await supabase.from('cursos').select('*')
    setCursos(crsData || [])

    setLoading(false)
  }

  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return 'N/D'
    const hoy = new Date()
    const nacimiento = new Date(fechaNac)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const m = hoy.getMonth() - nacimiento.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return `${edad} años`
  }

  const guardarPersonal = async (e) => {
    e.preventDefault()
    const { error } = await supabase
      .from('alumnos')
      .update({
        nombre: formPersonal.nombre,
        correo: formPersonal.correo,
        telefono: formPersonal.telefono,
        fecha_nacimiento: formPersonal.fecha_nacimiento,
        direccion: formPersonal.direccion
      })
      .eq('id', alumnoId)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      alert('¡Información personal actualizada con éxito!')
      setEditandoPersonal(false)
      cargarExpedienteCompleto()
    }
  }

  const registrarPago = async (pagoId) => {
    const { error } = await supabase
      .from('pagos')
      .update({ estatus: 'Pagado' })
      .eq('id', pagoId)

    if (error) {
      alert('Error al registrar pago: ' + error.message)
    } else {
      alert('¡Pago registrado como Pagado exitosamente!')
      cargarExpedienteCompleto()
    }
  }

  const eliminarAlumno = async () => {
    if (!confirm('¿Estás seguro de eliminar este estudiante y todo su expediente? Esta acción no se puede deshacer.')) return
    
    const { error } = await supabase.from('alumnos').delete().eq('id', alumnoId)
    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      alert('Estudiante eliminado correctamente.')
      window.location.href = '/admin/estudiantes'
    }
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc] text-xs font-semibold text-slate-500">Cargando expediente universitario...</div>
  }

  if (!alumno) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc] text-xs text-rose-600">No se encontró el expediente del estudiante.</div>
  }

  const nombreAlumno = alumno.nombre || alumno.Nombre || 'Estudiante'
  const iniciales = nombreAlumno.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  const edadStr = calcularEdad(alumno.fecha_nacimiento || alumno.Fecha_nacimiento)

  const pagosPendientesLista = pagos.filter(p => p.estatus !== 'Pagado')
  const totalPendienteMonto = pagosPendientesLista.reduce((acc, p) => acc + Number(p.monto || p.Monto || 0), 0)
  const pagosVencidosCount = pagos.filter(p => p.estatus === 'Vencido' || (p.estatus === 'Pendiente' && new Date(p.fecha_vencimiento) < new Date())).length
  const cuotasPagadasCount = pagos.filter(p => p.estatus === 'Pagado').length

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
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <a href="/admin/estudiantes" className="text-xs text-slate-400 hover:text-indigo-600 font-semibold transition">← Volver al listado</a>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-700">Expediente Universitario</span>
          </div>
          
          <button 
            onClick={() => alert(`Inscribiendo a ${nombreAlumno}... Redirigiendo a asignación de grupo.`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            Inscribir a {nombreAlumno.split(' ')[0]}
          </button>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
          
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center font-extrabold text-lg border border-indigo-100 shadow-sm">
                  {iniciales}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{nombreAlumno}</h1>
                  <p className="text-xs font-mono text-indigo-600 mt-0.5">Matrícula: #{alumno.matricula || alumnoId}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <span>🎂</span>
                <span>{edadStr}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>📚</span>
                <button onClick={() => setTabActiva('inscripciones')} className="text-indigo-600 font-bold hover:underline">
                  {inscripciones.length} inscripciones activas
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span>⚠️</span>
                <button onClick={() => setTabActiva('pagos')} className={`font-bold hover:underline ${pagosPendientesLista.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {pagosPendientesLista.length} pagos pendientes
                </button>
              </div>
            </div>

            <div className="flex gap-2 border-b border-slate-200 pt-4 text-xs font-semibold">
              <button 
                onClick={() => setTabActiva('resumen')}
                className={`pb-3 px-4 border-b-2 transition ${tabActiva === 'resumen' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Resumen
              </button>
              <button 
                onClick={() => setTabActiva('personal')}
                className={`pb-3 px-4 border-b-2 transition ${tabActiva === 'personal' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Personal
              </button>
              <button 
                onClick={() => setTabActiva('inscripciones')}
                className={`pb-3 px-4 border-b-2 transition ${tabActiva === 'inscripciones' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Inscripciones ({inscripciones.length})
              </button>
              <button 
                onClick={() => setTabActiva('pagos')}
                className={`pb-3 px-4 border-b-2 transition ${tabActiva === 'pagos' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Pagos
              </button>
              <button 
                onClick={() => setTabActiva('anotaciones')}
                className={`pb-3 px-4 border-b-2 transition ${tabActiva === 'anotaciones' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                Anotaciones
              </button>
            </div>
          </div>

          {tabActiva === 'resumen' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado Financiero</h3>
                
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900">$ {totalPendienteMonto.toLocaleString('es-MX')}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase">pendiente</span>
                  </div>
                  {pagosVencidosCount > 0 && (
                    <span className="inline-block bg-rose-50 text-rose-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-rose-100">
                      ⚠️ {pagosVencidosCount} vencida(s)
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-600">{cuotasPagadasCount} / {pagos.length} cuotas pagadas</span>
                    {pagosVencidosCount > 0 && <span className="text-rose-600">{pagosVencidosCount} vencida</span>}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: `${pagos.length ? (cuotasPagadasCount / pagos.length) * 100 : 0}%` }}></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Contraseña LMS: <strong className="font-mono text-indigo-600">{alumno.password || 'EAC2026*'}</strong></span>
                  <button onClick={() => setTabActiva('pagos')} className="text-indigo-600 font-bold hover:underline">
                    Ver todos los pagos →
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Inscripciones Activas</h3>
                  <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">{inscripciones.length}</span>
                </div>

                {inscripciones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-6 text-center">El alumno no tiene inscripciones activas actualmente.</p>
                ) : (
                  <div className="space-y-3">
                    {inscripciones.map((ins, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">Grupo ID #{ins.grupo_id}</h4>
                          <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Activa</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700">Inscrito</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 text-right">
                  <button onClick={() => setTabActiva('inscripciones')} className="text-xs text-indigo-600 font-bold hover:underline">
                    Ver todas las inscripciones →
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contacto Rápido</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <span className="text-lg">📧</span>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Correo Electrónico</span>
                      <span className="font-semibold text-slate-800">{alumno.correo || alumno.Correo || 'No registrado'}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <span className="text-lg">📞</span>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Teléfono de Contacto</span>
                      <span className="font-semibold text-slate-800">{alumno.telefono || alumno.Telefono || 'No registrado'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'personal' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Información Personal y Datos Generales</h3>
                  <p className="text-xs text-slate-400">La matrícula numérica no puede ser modificada.</p>
                </div>
                <button 
                  onClick={() => setEditandoPersonal(!editandoPersonal)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-semibold transition"
                >
                  {editandoPersonal ? 'Cancelar Edición' : '✏️ Editar Información'}
                </button>
              </div>

              {editandoPersonal ? (
                <form onSubmit={guardarPersonal} className="space-y-4 max-w-2xl">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo</label>
                    <input 
                      type="text"
                      value={formPersonal.nombre || ''}
                      onChange={(e) => setFormPersonal({ ...formPersonal, nombre: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                      <input 
                        type="email"
                        value={formPersonal.correo || ''}
                        onChange={(e) => setFormPersonal({ ...formPersonal, correo: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                      <input 
                        type="text"
                        value={formPersonal.telefono || ''}
                        onChange={(e) => setFormPersonal({ ...formPersonal, telefono: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha de Nacimiento</label>
                      <input 
                        type="date"
                        value={formPersonal.fecha_nacimiento || ''}
                        onChange={(e) => setFormPersonal({ ...formPersonal, fecha_nacimiento: e.target.value })}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Matrícula (Solo lectura)</label>
                      <input 
                        type="text"
                        disabled
                        value={formPersonal.matricula || ''}
                        className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-200 text-slate-500 cursor-not-allowed font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Dirección</label>
                    <input 
                      type="text"
                      value={formPersonal.direccion || ''}
                      onChange={(e) => setFormPersonal({ ...formPersonal, direccion: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition">
                    Guardar Cambios
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Nombre Completo</span>
                    <p className="font-semibold text-slate-800">{alumno.nombre || 'No registrado'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Correo Electrónico</span>
                    <p className="font-semibold text-slate-800">{alumno.correo || 'No registrado'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Teléfono</span>
                    <p className="font-semibold text-slate-800">{alumno.telefono || 'No registrado'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Fecha de Nacimiento</span>
                    <p className="font-semibold text-slate-800">{alumno.fecha_nacimiento || 'No registrada'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Matrícula Universitaria</span>
                    <p className="font-mono font-bold text-indigo-600">#{alumno.matricula || 'N/D'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Dirección</span>
                    <p className="font-semibold text-slate-800">{alumno.direccion || 'No registrada'}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'inscripciones' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <h3 className="text-sm font-bold text-slate-900">Historial de Inscripciones a Grupos y Cursos</h3>

              {inscripciones.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center">Este estudiante no cuenta con inscripciones registradas.</p>
              ) : (
                <div className="space-y-4">
                  {inscripciones.map((ins, idx) => (
                    <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <span className="bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full text-[10px]">Inscripción ID #{ins.id}</span>
                        <h4 className="font-bold text-slate-900 text-sm mt-1">Grupo ID #{ins.grupo_id}</h4>
                        <p className="text-[11px] text-slate-500">Estatus oficial en sistema</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full font-bold text-xs">
                        ● Activa
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabActiva === 'pagos' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-900">Historial de Pagos y Cuotas</h3>
                <span className="text-xs font-semibold text-slate-500">Total registros: {pagos.length}</span>
              </div>

              {pagos.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-8 text-center">No hay registros de pagos para este estudiante.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                        <th className="py-3 px-4">Concepto / ID Cuota</th>
                        <th className="py-3 px-4">Vencimiento</th>
                        <th className="py-3 px-4">Monto</th>
                        <th className="py-3 px-4">Estado</th>
                        <th className="py-3 px-4 text-right">Acción de Pago</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagos.map((p) => {
                        const monto = Number(p.monto || p.Monto || 0)
                        const estatus = p.estatus || p.Estatus || p.estado || 'Pendiente'
                        const vencimiento = p.fecha_vencimiento || p.Fecha_vencimiento || 'N/D'

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition">
                            <td className="py-4 px-4 font-bold text-slate-900">Cuota #{p.id}</td>
                            <td className="py-4 px-4 text-slate-600">{vencimiento}</td>
                            <td className="py-4 px-4 font-black text-slate-900">$ {monto.toLocaleString('es-MX')} MXN</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-full font-bold text-[10px] ${estatus === 'Pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {estatus}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              {estatus !== 'Pagado' ? (
                                <button 
                                  onClick={() => registrarPago(p.id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-semibold shadow-xs transition"
                                >
                                  Registrar pago
                                </button>
                              ) : (
                                <span className="text-slate-400 italic">Completado</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tabActiva === 'anotaciones' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
              <h3 className="text-sm font-bold text-slate-900">Anotaciones y Notas Internas del Estudiante</h3>
              
              <div className="space-y-3">
                <textarea 
                  rows="3"
                  value={nuevaNota}
                  onChange={(e) => setNuevaNota(e.target.value)}
                  placeholder="Escribe una nota interna sobre el alumno..."
                  className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                ></textarea>
                <div className="text-right">
                  <button 
                    onClick={() => {
                      if (!nuevaNota.trim()) return
                      setAnotaciones([nuevaNota, ...anotaciones])
                      setNuevaNota('')
                      alert('Nota agregada correctamente.')
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    Agregar Nota
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                {anotaciones.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay notas registradas para este alumno.</p>
                ) : (
                  anotaciones.map((nota, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-700">
                      <p>{nota}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Registrada hoy</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-200 text-right">
            <button 
              onClick={eliminarAlumno}
              className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-5 py-2.5 rounded-xl text-xs font-semibold transition border border-rose-200"
            >
              🗑️ Eliminar Estudiante del Sistema
            </button>
          </div>

        </div>
      </main>

    </div>
  )
}

export default function EstudianteDetallePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-[#f8fafc] text-xs font-semibold text-slate-500">Cargando expediente...</div>}>
      <DetalleContenido />
    </Suspense>
  )
}
