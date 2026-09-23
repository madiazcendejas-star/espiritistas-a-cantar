'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function EstudiantesAdminPage() {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const [formNuevo, setFormNuevo] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    matricula: '',
    password: 'EAC2026*'
  })

  useEffect(() => {
    cargarAlumnos()
  }, [])

  const cargarAlumnos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .order('id', { ascending: false })

    if (!error && data) {
      setAlumnos(data)
    }
    setLoading(false)
  }

  const crearAlumno = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const matriculaGenerada = formNuevo.matricula.trim() || `EAC-${Math.floor(1000 + Math.random() * 9000)}`

    const { error } = await supabase.from('alumnos').insert([
      {
        nombre: formNuevo.nombre.trim(),
        correo: formNuevo.correo.trim(),
        telefono: formNuevo.telefono.trim(),
        matricula: matriculaGenerada,
        password: formNuevo.password.trim()
      }
    ])

    if (error) {
      alert('Error al registrar estudiante: ' + error.message)
    } else {
      setModalNuevo(false)
      setFormNuevo({ nombre: '', correo: '', telefono: '', matricula: '', password: 'EAC2026*' })
      cargarAlumnos()
      alert('¡Estudiante registrado exitosamente!')
    }
    setGuardando(false)
  }

  const alumnosFiltrados = alumnos.filter(a => {
    const nombre = a.nombre || a.Nombre || a.nombre_completo || ''
    const correo = a.correo || a.Correo || ''
    const matricula = a.matricula || ''
    const termino = busqueda.toLowerCase()
    return nombre.toLowerCase().includes(termino) || correo.toLowerCase().includes(termino) || matricula.toLowerCase().includes(termino)
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
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Directorio de Estudiantes</h2>
          <button 
            onClick={() => setModalNuevo(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
          >
            <span>+</span> Registrar Estudiante
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
              placeholder="Buscar estudiante por nombre, correo o matrícula..." 
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* TABLA DE ESTUDIANTES */}
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Listado de Alumnos ({alumnosFiltrados.length})</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16 text-xs text-slate-400">Cargando directorio de estudiantes...</div>
              ) : alumnosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">No se encontraron estudiantes registrados.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-6">Matrícula</th>
                      <th className="py-3 px-6">Estudiante</th>
                      <th className="py-3 px-6">Contacto</th>
                      <th className="py-3 px-6">Contraseña LMS</th>
                      <th className="py-3 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {alumnosFiltrados.map((a) => {
                      const nombre = a.nombre || a.Nombre || a.nombre_completo || 'Sin nombre'
                      const correo = a.correo || a.Correo || 'Sin correo'
                      const telefono = a.telefono || a.Telefono || 'Sin teléfono'
                      const matricula = a.matricula || `EAC-${a.id}`
                      const password = a.password || 'EAC2026*'
                      const iniciales = nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()

                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-6 font-mono text-indigo-600 font-bold">#{matricula}</td>
                          <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-3">
                            <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-extrabold text-[11px]">
                              {iniciales}
                            </div>
                            <span>{nombre}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-500">
                            <div>{correo}</div>
                            <div className="text-[11px] text-slate-400">{telefono}</div>
                          </td>
                          <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                            {password}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <a 
                              href={`/admin/estudiantes/detalle?id=${a.id}`} 
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold transition inline-block"
                            >
                              Ver expediente →
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* MODAL NUEVO ESTUDIANTE */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Registrar Nuevo Estudiante</h3>
              <p className="text-xs text-slate-400 mt-0.5">Ingresa los datos generales y su contraseña inicial de acceso al LMS.</p>
            </div>

            <form onSubmit={crearAlumno} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  value={formNuevo.nombre}
                  onChange={(e) => setFormNuevo({ ...formNuevo, nombre: e.target.value })}
                  placeholder="Ej. María Elena Rivas"
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={formNuevo.correo}
                    onChange={(e) => setFormNuevo({ ...formNuevo, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={formNuevo.telefono}
                    onChange={(e) => setFormNuevo({ ...formNuevo, telefono: e.target.value })}
                    placeholder="5512345678"
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">🔑 Contraseña Inicial LMS</label>
                <input 
                  type="text" 
                  required
                  value={formNuevo.password}
                  onChange={(e) => setFormNuevo({ ...formNuevo, password: e.target.value })}
                  placeholder="EAC2026*"
                  className="w-full p-3 border border-indigo-200 rounded-xl text-xs bg-indigo-50/50 outline-none focus:border-indigo-600 font-mono font-bold text-indigo-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalNuevo(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50">
                  {guardando ? 'Guardando...' : 'Registrar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
