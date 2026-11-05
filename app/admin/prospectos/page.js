'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ProspectosPage() {
  const [prospectos, setProspectos] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('todos')

  // Modal para Nuevo Prospecto
  const [modalProspecto, setModalProspecto] = useState(false)
  const [formProspecto, setFormProspecto] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    curso_id: '',
    estatus: 'Nuevo',
    notas: ''
  })

  // Modal para Enviar Mensaje / Secuencia de WhatsApp
  const [modalMensaje, setModalMensaje] = useState(false)
  const [prospectoSeleccionado, setProspectoSeleccionado] = useState(null)
  const [tipoMensaje, setTipoMensaje] = useState('primer_contacto')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const { data: resProspectos } = await supabase.from('prospectos').select('*').order('id', { ascending: false })
    const { data: resCursos } = await supabase.from('cursos').select('*')

    if (resProspectos) setProspectos(resProspectos)
    if (resCursos) setCursos(resCursos)
    setLoading(false)
  }

  const crearProspecto = async (e) => {
    e.preventDefault()
    if (!formProspecto.nombre.trim()) return alert('El nombre es obligatorio.')

    const { error } = await supabase.from('prospectos').insert([{
      nombre: formProspecto.nombre.trim(),
      telefono: formProspecto.telefono.trim(),
      correo: formProspecto.correo.trim(),
      curso_id: formProspecto.curso_id ? Number(formProspecto.curso_id) : null,
      estatus: formProspecto.estatus,
      notas: formProspecto.notas.trim()
    }])

    if (error) {
      alert('Error al registrar prospecto: ' + error.message)
    } else {
      setModalProspecto(false)
      setFormProspecto({ nombre: '', telefono: '', correo: '', curso_id: '', estatus: 'Nuevo', notas: '' })
      cargarDatos()
      alert('¡Prospecto registrado con éxito!')
    }
  }

  const actualizarEstatus = async (id, nuevoEstatus) => {
    const { error } = await supabase.from('prospectos').update({ estatus: nuevoEstatus }).eq('id', id)
    if (!error) cargarDatos()
  }

  const eliminarProspecto = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este prospecto?')) return
    const { error } = await supabase.from('prospectos').delete().eq('id', id)
    if (!error) cargarDatos()
  }

  // Generador de Enlaces de WhatsApp con Plantillas Persuasivas
  const generarEnlaceWhatsApp = (prospecto) => {
    const cursoObj = cursos.find(c => Number(c.id) === Number(prospecto.curso_id))
    const nombreCurso = cursoObj?.Nombre_curso || cursoObj?.nombre_curso || 'nuestros talleres'
    const nombre = prospecto.nombre || 'Estimado(a)'

    let mensaje = ''
    if (tipoMensaje === 'primer_contacto') {
      mensaje = `¡Hola ${nombre}! Qué gusto saludarte. Vi tu interés en el curso *${nombreCurso}* en Espiritistas a Cantar. ¿Te gustaría que te comparta el temario completo o tienes alguna duda sobre fechas y horarios?`
    } else if (tipoMensaje === 'seguimiento') {
      mensaje = `¡Hola ${nombre}! Espero que tengas excelente semana. Te escribo porque los lugares para el curso *${nombreCurso}* se están llenando y no quería que te quedaras fuera. ¿Te aparto tu lugar?`
    } else if (tipoMensaje === 'urgencia') {
      mensaje = `¡Hola ${nombre}! ¿Cómo estás? Te cuento que estamos a pocos días de arrancar con el curso *${nombreCurso}* y nos quedan muy pocos lugares disponibles. ¿Tienes algún problema con tu proceso de inscripción para echarte la mano?`
    }

    const telefonoLimpio = (prospecto.telefono || '').replace(/\D/g, '')
    return `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
  }

  const totalProspectos = prospectos.length
  const nuevos = prospectos.filter(p => p.estatus === 'Nuevo').length
  const enSeguimiento = prospectos.filter(p => p.estatus === 'Seguimiento' || p.estatus === 'Interesado').length
  const inscritos = prospectos.filter(p => p.estatus === 'Inscrito').length

  const prospectosFiltrados = prospectos.filter(p => {
    const cursoObj = cursos.find(c => Number(c.id) === Number(p.curso_id))
    const nombreCurso = cursoObj?.Nombre_curso || cursoObj?.nombre_curso || ''
    const coincideTexto = (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) || 
                          (p.telefono || '').includes(busqueda) || 
                          nombreCurso.toLowerCase().includes(busqueda.toLowerCase())
    
    if (filtroEstatus !== 'todos' && p.estatus !== filtroEstatus) return false
    return coincideTexto
  })

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR */}
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
          <a href="/admin/prospectos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🎯 Prospectos (CRM)</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Embudo de Prospectos (CRM)</h2>
            <p className="text-[11px] text-slate-500">Registra y da seguimiento a tus interesados para convertirlos en alumnos</p>
          </div>
          <button onClick={() => setModalProspecto(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2">
            <span>+</span> Nuevo Prospecto
          </button>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Prospectos</span>
              <div className="text-2xl font-black text-slate-900">{totalProspectos}</div>
              <span className="text-[11px] text-slate-500">Base general de interesados</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nuevos</span>
              <div className="text-2xl font-black text-indigo-600">{nuevos}</div>
              <span className="text-[11px] text-slate-500">Pendientes de primer contacto</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Seguimiento</span>
              <div className="text-2xl font-black text-amber-500">{enSeguimiento}</div>
              <span className="text-[11px] text-slate-500">En labor de convencimiento</span>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Convertidos a Inscritos</span>
              <div className="text-2xl font-black text-emerald-600">{inscritos}</div>
              <span className="text-[11px] text-slate-500">Ventas cerradas con éxito</span>
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
                placeholder="Buscar por nombre, teléfono o curso de interés..." 
                className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <select 
                value={filtroEstatus} 
                onChange={(e) => setFiltroEstatus(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none font-medium"
              >
                <option value="todos">Todos los estatus</option>
                <option value="Nuevo">Nuevo</option>
                <option value="Seguimiento">Seguimiento</option>
                <option value="Interesado">Interesado</option>
                <option value="Inscrito">Inscrito</option>
              </select>
            </div>
          </div>

          {/* TABLA DE PROSPECTOS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {prospectosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">No hay prospectos registrados con estos filtros.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-4">Prospecto</th>
                      <th className="p-4">Contacto</th>
                      <th className="p-4">Curso de Interés</th>
                      <th className="p-4">Estatus</th>
                      <th className="p-4">Notas / Observaciones</th>
                      <th className="p-4 text-right">Acciones de Persuasión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {prospectosFiltrados.map(p => {
                      const cursoObj = cursos.find(c => Number(c.id) === Number(p.curso_id))
                      const nombreCurso = cursoObj?.Nombre_curso || cursoObj?.nombre_curso || 'Sin curso asignado'

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition">
                          <td className="p-4 font-bold text-slate-900">{p.nombre}</td>
                          <td className="p-4 text-slate-600">
                            <div>📞 {p.telefono || 'Sin teléfono'}</div>
                            <div className="text-[11px] text-slate-400">📧 {p.correo || 'Sin correo'}</div>
                          </td>
                          <td className="p-4">
                            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full font-bold text-[10px] uppercase">
                              {nombreCurso}
                            </span>
                          </td>
                          <td className="p-4">
                            <select 
                              value={p.estatus || 'Nuevo'} 
                              onChange={(e) => actualizarEstatus(p.id, e.target.value)}
                              className={`p-2 rounded-xl text-xs font-bold outline-none border ${
                                p.estatus === 'Inscrito' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                p.estatus === 'Seguimiento' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              <option value="Nuevo">Nuevo</option>
                              <option value="Seguimiento">Seguimiento</option>
                              <option value="Interesado">Interesado</option>
                              <option value="Inscrito">Inscrito</option>
                            </select>
                          </td>
                          <td className="p-4 text-slate-500 italic max-w-xs truncate">{p.notas || 'Sin notas'}</td>
                          <td className="p-4 text-right space-x-2">
                            <button 
                              onClick={() => {
                                setProspectoSeleccionado(p)
                                setModalMensaje(true)
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold transition inline-flex items-center gap-1 shadow-xs"
                            >
                              <span>💬</span> WhatsApp
                            </button>
                            <button 
                              onClick={() => eliminarProspecto(p.id)} 
                              className="text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition font-bold"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL NUEVO PROSPECTO */}
      {modalProspecto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">Registrar Nuevo Prospecto</h3>
              <button onClick={() => setModalProspecto(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">✕</button>
            </div>
            <form onSubmit={crearProspecto} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  value={formProspecto.nombre}
                  onChange={(e) => setFormProspecto({ ...formProspecto, nombre: e.target.value })}
                  placeholder="Ej. María López"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono / WhatsApp</label>
                  <input 
                    type="text" 
                    value={formProspecto.telefono}
                    onChange={(e) => setFormProspecto({ ...formProspecto, telefono: e.target.value })}
                    placeholder="Ej. 5215512345678"
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={formProspecto.correo}
                    onChange={(e) => setFormProspecto({ ...formProspecto, correo: e.target.value })}
                    placeholder="correo@gmail.com"
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Curso de Interés</label>
                <select 
                  value={formProspecto.curso_id}
                  onChange={(e) => setFormProspecto({ ...formProspecto, curso_id: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                >
                  <option value="">Seleccione un curso...</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.Nombre_curso || c.nombre_curso}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Notas / Observaciones</label>
                <textarea 
                  rows="3"
                  value={formProspecto.notas}
                  onChange={(e) => setFormProspecto({ ...formProspecto, notas: e.target.value })}
                  placeholder="Ej. Preguntó por becas o pagos en dos partes..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalProspecto(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold">Guardar Prospecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE MENSAJE DE WHATSAPP INTEGRADO */}
      {modalMensaje && prospectoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">💬 Enviar WhatsApp a {prospectoSeleccionado.nombre}</h3>
              <button onClick={() => setModalMensaje(false)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs">✕</button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Seleccionar Tipo de Plantilla</label>
                <select 
                  value={tipoMensaje}
                  onChange={(e) => setTipoMensaje(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none font-semibold text-indigo-600"
                >
                  <option value="primer_contacto">1. Primer Contacto (Bienvenida y Valor)</option>
                  <option value="seguimiento">2. Seguimiento (Lugares limitados)</option>
                  <option value="urgencia">3. Urgencia / Cierre (Cercanía de inicio)</option>
                </select>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                <span className="text-[10px] font-bold uppercase text-emerald-900 block">Vista previa del mensaje:</span>
                <p className="text-xs text-emerald-800 italic bg-white p-3 rounded-xl border border-emerald-200">
                  "{
                    (() => {
                      const cursoObj = cursos.find(c => Number(c.id) === Number(prospectoSeleccionado.curso_id))
                      const nombreCurso = cursoObj?.Nombre_curso || cursoObj?.nombre_curso || 'nuestros talleres'
                      const nombre = prospectoSeleccionado.nombre || 'Estimado(a)'

                      if (tipoMensaje === 'primer_contacto') {
                        return `¡Hola ${nombre}! Qué gusto saludarte. Vi tu interés en el curso *${nombreCurso}* en Espiritistas a Cantar. ¿Te gustaría que te comparta el temario completo o tienes alguna duda sobre fechas y horarios?`
                      } else if (tipoMensaje === 'seguimiento') {
                        return `¡Hola ${nombre}! Espero que tengas excelente semana. Te escribo porque los lugares para el curso *${nombreCurso}* se están llenando y no quería que te quedaras fuera. ¿Te aparto tu lugar?`
                      } else {
                        return `¡Hola ${nombre}! ¿Cómo estás? Te cuento que estamos a pocos días de arrancar con el curso *${nombreCurso}* y nos quedan muy pocos lugares disponibles. ¿Tienes algún problema con tu proceso de inscripción para echarte la mano?`
                      }
                    })()
                  }"
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalMensaje(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <a 
                  href={generarEnlaceWhatsApp(prospectoSeleccionado)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => setModalMensaje(false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-semibold shadow-md inline-flex items-center gap-2"
                >
                  <span>🚀 Abrir WhatsApp Web / App</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
