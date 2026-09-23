'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function DetalleEstudiantePage() {
  const [alumno, setAlumno] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tabActiva, setTabActiva] = useState('resumen')
  
  // Estados para modales y edición
  const [modalInscribir, setModalInscribir] = useState(false)
  const [cursoSeleccionado, setCursoSeleccionado] = useState('')
  const [modalEditar, setModalEditar] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  // Formulario de edición de datos y contraseña LMS
  const [formEdicion, setFormEdicion] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    password: '',
    fecha_nacimiento: '',
    estado: '',
    cp: '',
    pais: ''
  })

  const [inscripciones, setInscripciones] = useState([
    { id: 1, curso: 'Sala de 2 · Matutino', costo: 13500, estado: 'Activa' }
  ])
  const [pagos, setPagos] = useState([
    { id: 'D61MFX', descripcion: 'October 2026 - Sala de 2', vencimiento: '22 oct 2026', monto: 17700, estado: 'Pendiente' },
    { id: '9A58CT', descripcion: 'September 2026 - Sala de 2', vencimiento: '22 sep 2026', monto: 17700, estado: 'Pagado' }
  ])
  const [anotaciones, setAnotaciones] = useState([])
  const [nuevaNota, setNuevaNota] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const idParam = params.get('id')
    
    if (idParam) {
      cargarDatosAlumno(idParam)
    } else {
      setLoading(false)
    }
  }, [])

  const cargarDatosAlumno = async (valor) => {
    setLoading(true)
    const { data: todos, error } = await supabase
      .from('alumnos')
      .select('*')

    if (!error && todos) {
      const encontrado = todos.find(
        (a) => String(a.id) === String(valor) || String(a.matricula) === String(valor)
      )
      if (encontrado) {
        setAlumno(encontrado)
        setFormEdicion({
          nombre: encontrado.nombre || '',
          correo: encontrado.correo || '',
          telefono: encontrado.telefono || '',
          password: encontrado.password || '',
          fecha_nacimiento: encontrado.fecha_nacimiento || '',
          estado: encontrado.estado || '',
          cp: encontrado.cp || '',
          pais: encontrado.pais || 'México'
        })
      }
    }
    setLoading(false)
  }

  const guardarEdicion = async (e) => {
    e.preventDefault()
    setGuardandoEdicion(true)

    const { error } = await supabase
      .from('alumnos')
      .update({
        nombre: formEdicion.nombre.trim(),
        correo: formEdicion.correo.trim(),
        telefono: formEdicion.telefono.trim(),
        password: formEdicion.password.trim(),
        fecha_nacimiento: formEdicion.fecha_nacimiento || null,
        estado: formEdicion.estado.trim(),
        cp: formEdicion.cp.trim(),
        pais: formEdicion.pais.trim()
      })
      .eq('id', alumno.id)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      alert('Información y contraseña actualizadas exitosamente')
      setModalEditar(false)
      cargarDatosAlumno(alumno.id)
    }
    setGuardandoEdicion(false)
  }

  const eliminarEstudiante = async () => {
    if (confirm('¿Estás seguro de eliminar este estudiante de la academia? Esta acción es irreversible.')) {
      const { error } = await supabase.from('alumnos').delete().eq('id', alumno.id)
      if (!error) {
        window.location.href = '/admin/estudiantes'
      } else {
        alert('Error al eliminar: ' + error.message)
      }
    }
  }

  const agregarNota = (e) => {
    e.preventDefault()
    if (!nuevaNota.trim()) return
    setAnotaciones([...anotaciones, { texto: nuevaNota, fecha: new Date().toLocaleDateString() }])
    setNuevaNota('')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-xs text-slate-500 font-sans">Cargando expediente del estudiante...</div>
  }

  if (!alumno) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-xs text-slate-500 font-sans">Estudiante no encontrado en la base de datos.</div>
  }

  const nombreAlumno = alumno.nombre || alumno.Nombre || alumno.nombre_completo || 'Estudiante'
  const iniciales = nombreAlumno.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans text-slate-900">
      
      {/* HEADER DE PERFIL */}
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-30 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <a href="/admin/estudiantes" className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition text-sm font-bold">
              ←
            </a>
            <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-extrabold text-sm shadow-xs">
              {iniciales}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900">{nombreAlumno}</h1>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">#{alumno.matricula || `EAC-${alumno.id}`}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Matriculado en la academia</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setModalInscribir(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <span>+</span> Inscribir a {nombreAlumno.split(' ')[0]}
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500 border-t border-slate-100">
          <span className="text-indigo-600 font-semibold">{inscripciones.length} Inscripción activa</span>
          <span>•</span>
          <span className="text-amber-600 font-semibold">1 Pago pendiente</span>
          <span>•</span>
          <span className="text-emerald-600 font-semibold">100% Asistencia</span>
        </div>

        {/* PESTAÑAS */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs font-semibold">
          <button onClick={() => setTabActiva('resumen')} className={`px-4 py-2 rounded-xl transition ${tabActiva === 'resumen' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>📊 Resumen</button>
          <button onClick={() => setTabActiva('personal')} className={`px-4 py-2 rounded-xl transition ${tabActiva === 'personal' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>👤 Personal</button>
          <button onClick={() => setTabActiva('inscripciones')} className={`px-4 py-2 rounded-xl transition ${tabActiva === 'inscripciones' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>📚 Inscripciones</button>
          <button onClick={() => setTabActiva('pagos')} className={`px-4 py-2 rounded-xl transition ${tabActiva === 'pagos' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>💳 Pagos</button>
          <button onClick={() => setTabActiva('asistencia')} className={`px-4 py-2 rounded-xl transition ${tabActiva === 'asistencia' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>✅ Asistencia</button>
          <button onClick={() => setTabActiva('anotaciones')} className={`px-4 py-2 rounded-xl transition ${tabActiva === 'anotaciones' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>📝 Anotaciones</button>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-8 space-y-6">
        
        {/* TAB 1: RESUMEN */}
        {tabActiva === 'resumen' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Pagos</h3>
                  <button onClick={() => setTabActiva('pagos')} className="text-xs font-semibold text-indigo-600 hover:underline">Ver todos los pagos →</button>
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-slate-900">$ 17,700.00 <span className="text-xs font-normal text-slate-400">pendiente</span></h4>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-3">
                    <div className="bg-emerald-500 h-full w-3/4"></div>
                  </div>
                  <p className="text-xs text-slate-500">3/4 cuotas pagadas • Próximo vto: 22 oct</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Inscripciones Activas</h3>
                  <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">{inscripciones.length}</span>
                </div>
                <div className="space-y-3">
                  {inscripciones.map((ins, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{ins.curso}</p>
                        <span className="text-[10px] text-slate-400">$ {ins.costo.toLocaleString('es-MX')} MXN</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">Activa</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h4 className="text-sm font-bold text-rose-600">Zona de peligro</h4>
                <p className="text-xs text-slate-400">Eliminar este estudiante de la academia es una acción irreversible.</p>
              </div>
              <button onClick={eliminarEstudiante} className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2.5 rounded-xl text-xs font-semibold transition border border-rose-200">
                Eliminar Estudiante
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL (INCLUYE CONTRASEÑA LMS) */}
        {tabActiva === 'personal' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Información Personal y Acceso LMS</h3>
                <p className="text-xs text-slate-400 mt-0.5">Credenciales y datos generales registrados en el sistema.</p>
              </div>
              <button 
                onClick={() => setModalEditar(true)} 
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold transition"
              >
                ✏️ Editar Datos y Contraseña
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Nombre Completo</span>
                <p className="text-slate-900 font-semibold mt-1">{nombreAlumno}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Correo Electrónico</span>
                <p className="text-slate-900 font-semibold mt-1">{alumno.correo || alumno.Correo || 'Sin correo'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Teléfono</span>
                <p className="text-slate-900 font-semibold mt-1">{alumno.telefono || alumno.Telefono || 'Sin teléfono'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Contraseña de Acceso LMS</span>
                <p className="text-indigo-600 font-mono font-bold mt-1 bg-indigo-50 px-2.5 py-1 rounded-lg inline-block">
                  {alumno.password || 'EAC2026*'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Fecha de Nacimiento</span>
                <p className="text-slate-900 font-semibold mt-1">{alumno.fecha_nacimiento || 'No especificada'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">Ubicación (Estado / CP)</span>
                <p className="text-slate-900 font-semibold mt-1">{alumno.estado ? `${alumno.estado} (CP: ${alumno.cp})` : 'No especificada'}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-bold uppercase text-[10px]">País</span>
                <p className="text-slate-900 font-semibold mt-1">{alumno.pais || 'México'}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INSCRIPCIONES */}
        {tabActiva === 'inscripciones' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-900">Inscripciones a Grupos y Cursos</h3>
              <button onClick={() => setModalInscribir(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">Inscribir a Curso</button>
            </div>
            <div className="space-y-3">
              {inscripciones.map((ins, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center">
                  <div><h4 className="text-xs font-bold text-slate-900">{ins.curso}</h4><p className="text-[11px] text-slate-500">Costo mensual: $ {ins.costo.toLocaleString('es-MX')} MXN</p></div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">Activa</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PAGOS */}
        {tabActiva === 'pagos' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Pagos Vencidos</span><h3 className="text-xl font-extrabold text-rose-600 mt-1">$ 0.00</h3></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Próximos Pagos</span><h3 className="text-xl font-extrabold text-slate-900 mt-1">$ 17,700.00</h3></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Total Cobrado</span><h3 className="text-xl font-extrabold text-emerald-600 mt-1">$ 47,400.00</h3></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200"><span className="text-[10px] font-bold text-slate-400 uppercase">Tasa de Cobro</span><h3 className="text-xl font-extrabold text-indigo-600 mt-1">72.8%</h3></div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="p-6 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-900">Historial y Desglose de Pagos</h3></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-6">ID</th><th className="py-3 px-6">Descripción</th><th className="py-3 px-6">Vencimiento</th><th className="py-3 px-6">Monto</th><th className="py-3 px-6">Estado</th><th className="py-3 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {pagos.map((p, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-mono text-indigo-600 font-bold">#{p.id}</td>
                        <td className="py-4 px-6 font-medium text-slate-900">{p.descripcion}</td>
                        <td className="py-4 px-6 text-slate-500">{p.vencimiento}</td>
                        <td className="py-4 px-6 font-extrabold text-slate-900">$ {p.monto.toLocaleString('es-MX')}</td>
                        <td className="py-4 px-6"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.estado === 'Pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{p.estado}</span></td>
                        <td className="py-4 px-6 text-right"><button onClick={() => alert('Registrar pago')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-[10px] font-semibold">Registrar pago</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ASISTENCIA */}
        {tabActiva === 'asistencia' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Control de Asistencia</h3>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div><span className="text-3xl font-extrabold text-emerald-600">100%</span><p className="text-xs text-slate-500 mt-1">22 de 22 clases asistidas correctamente</p></div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">Racha perfecta 🔥</span>
            </div>
          </div>
        )}

        {/* TAB 6: ANOTACIONES */}
        {tabActiva === 'anotaciones' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
            <h3 className="text-base font-bold text-slate-900">Notas y Observaciones</h3>
            <form onSubmit={agregarNota} className="space-y-3">
              <textarea rows="3" value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="Escriba una nota interna sobre el estudiante..." className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50 resize-none" />
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold">+ Nueva Anotación</button>
            </form>
            <div className="space-y-3 pt-4">
              {anotaciones.length === 0 ? <p className="text-xs text-slate-400 text-center py-6">No hay notas para este estudiante aún.</p> : anotaciones.map((n, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1"><span className="text-[10px] text-slate-400">{n.fecha}</span><p className="text-xs text-slate-700">{n.texto}</p></div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL DE EDICIÓN DE DATOS Y CONTRASEÑA LMS */}
      {modalEditar && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Editar Datos y Contraseña LMS</h3>
              <p className="text-xs text-slate-400 mt-0.5">Modifica la información del alumno o establece su contraseña de acceso al sitio.</p>
            </div>

            <form onSubmit={guardarEdicion} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={formEdicion.nombre}
                  onChange={(e) => setFormEdicion({ ...formEdicion, nombre: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={formEdicion.telefono}
                    onChange={(e) => setFormEdicion({ ...formEdicion, telefono: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={formEdicion.correo}
                    onChange={(e) => setFormEdicion({ ...formEdicion, correo: e.target.value })}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">🔑 Contraseña de Acceso LMS</label>
                <input 
                  type="text" 
                  required
                  value={formEdicion.password}
                  onChange={(e) => setFormEdicion({ ...formEdicion, password: e.target.value })}
                  placeholder="Contraseña para el portal del alumno"
                  className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-indigo-50/50 outline-none focus:border-indigo-600 font-mono font-bold text-indigo-700"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Estado</label>
                  <input 
                    type="text" 
                    value={formEdicion.estado}
                    onChange={(e) => setFormEdicion({ ...formEdicion, estado: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">C.P.</label>
                  <input 
                    type="text" 
                    value={formEdicion.cp}
                    onChange={(e) => setFormEdicion({ ...formEdicion, cp: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">País</label>
                  <input 
                    type="text" 
                    value={formEdicion.pais}
                    onChange={(e) => setFormEdicion({ ...formEdicion, pais: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalEditar(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button 
                  type="submit" 
                  disabled={guardandoEdicion}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL INSCRIBIR */}
      {modalInscribir && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Inscribir a {nombreAlumno}</h3>
            <select value={cursoSeleccionado} onChange={(e) => setCursoSeleccionado(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none">
              <option value="">Seleccione un curso...</option>
              <option value="Sala de 2 · Matutino">Sala de 2 · Matutino ($13,500)</option>
              <option value="Canto y Espiritualidad">Canto y Espiritualidad Avanzada</option>
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setModalInscribir(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
              <button onClick={() => { if(!cursoSeleccionado) return alert('Seleccione un curso'); setInscripciones([...inscripciones, { curso: cursoSeleccionado, costo: 13500, estado: 'Activa' }]); setModalInscribir(false); alert('Inscrito exitosamente'); }} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-xs font-semibold">Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
