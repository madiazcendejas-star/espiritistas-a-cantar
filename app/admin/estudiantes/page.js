'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function EstudiantesPage() {
  const [alumnos, setAlumnos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario nuevo alumno
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    correo: '',
    password: ''
  })

  useEffect(() => {
    // Validar sesión de admin
    const sesion = localStorage.getItem('eac_sesion')
    if (!sesion) {
      window.location.href = '/'
      return
    }
    const datos = JSON.parse(sesion)
    if (datos.rol !== 'admin') {
      window.location.href = '/'
      return
    }

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

  const registrarAlumno = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const matriculaAleatoria = `EAC-${Math.floor(1000 + Math.random() * 9000)}`

    const { error } = await supabase.from('alumnos').insert([
      {
        Nombre: nuevoAlumno.nombre.trim(),
        apellidos: nuevoAlumno.apellidos.trim(),
        telefono: nuevoAlumno.telefono.trim(),
        correo: nuevoAlumno.correo.trim(),
        password: nuevoAlumno.password.trim(),
        Matricula: matriculaAleatoria,
        primer_ingreso: true
      }
    ])

    if (error) {
      alert('Error al registrar estudiante: ' + error.message)
    } else {
      setModalAbierto(false)
      setNuevoAlumno({ nombre: '', apellidos: '', telefono: '', correo: '', password: '' })
      cargarAlumnos()
    }
    setGuardando(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

  // Filtrado de búsqueda
  const alumnosFiltrados = alumnos.filter(a => {
    const termino = busqueda.toLowerCase()
    const nombreCompleto = `${a.Nombre || ''} ${a.apellidos || ''}`.toLowerCase()
    const tel = (a.telefono || '').toLowerCase()
    const mat = (a.Matricula || '').toLowerCase()
    const mail = (a.correo || '').toLowerCase()
    return nombreCompleto.includes(termino) || tel.includes(termino) || mat.includes(termino) || mail.includes(termino)
  })

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100 font-sans">
      
      {/* SIDEBAR INSTITUCIONAL */}
      <aside className="w-64 bg-[#0f172a] text-slate-300 hidden md:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-800/60">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-sm">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-[13px] leading-tight">Espiritistas a Cantar</span>
              <span className="text-[10px] text-indigo-400 font-medium">Panel Directivo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto text-sm">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-wider text-slate-500 font-bold">Gestión Académica</div>
          
          <a href="/admin" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>📊</span> Dashboard
          </a>
          <a href="/admin/estudiantes" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-indigo-600 text-white font-semibold transition">
            <span>🎓</span> Estudiantes
          </a>
          <a href="#" onClick={() => alert('Módulo de Cursos en el siguiente paso')} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>📚</span> Programas / Cursos
          </a>
          <a href="#" onClick={() => alert('Módulo de Cobranza en el siguiente paso')} className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>💳</span> Finanzas y Cobranza
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <button 
            onClick={cerrarSesion}
            className="w-full flex items-center justify-center gap-2 bg-slate-800/40 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 py-2.5 rounded-xl text-xs font-semibold transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative w-full">
        
        {/* Header Superior */}
        <header className="bg-white border-b border-slate-200/80 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Directorio de Estudiantes</h1>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-900">Control Escolar</span>
              <span className="block text-[10px] text-indigo-600 font-semibold">Alumnado Activo</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">A</div>
          </div>
        </header>

        {/* Contenedor de la Tabla y Filtros */}
        <div className="p-8 max-w-[1400px] mx-auto w-full space-y-6">
          
          {/* Barra de Acciones */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="w-full sm:w-96 relative">
              <span className="absolute left-4 top-3 text-slate-400 text-sm">🔍</span>
              <input 
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, matrícula o teléfono..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-600 shadow-sm"
              />
            </div>

            <button 
              onClick={() => setModalAbierto(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <span>+</span> Nuevo Estudiante
            </button>
          </div>

          {/* Tabla de Estudiantes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="py-4 px-6">Matrícula</th>
                    <th className="py-4 px-6">Estudiante</th>
                    <th className="py-4 px-6">Contacto</th>
                    <th className="py-4 px-6">Contraseña</th>
                    <th className="py-4 px-6 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-slate-400">Cargando expedientes...</td>
                    </tr>
                  ) : alumnosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-slate-400">No se encontraron estudiantes.</td>
                    </tr>
                  ) : (
                    alumnosFiltrados.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-semibold text-indigo-600">{a.Matricula || 'EAC'}</td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-900">{a.Nombre} {a.apellidos || ''}</p>
                          <p className="text-[11px] text-slate-400">{a.correo || 'Sin correo'}</p>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-600">{a.telefono}</td>
                        <td className="py-4 px-6 font-mono text-[11px] text-slate-500 bg-slate-50/50 rounded-lg">{a.password}</td>
                        <td className="py-4 px-6 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600">
                            Activo
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL NUEVO ESTUDIANTE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Registrar Nuevo Estudiante</h3>
            <p className="text-xs text-slate-400 mb-6">Se generará su matrícula académica automáticamente.</p>

            <form onSubmit={registrarAlumno} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre(s) *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.nombre}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })}
                  placeholder="Ej. Juan"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Apellidos *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.apellidos}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, apellidos: e.target.value })}
                  placeholder="Ej. Pérez García"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono (WhatsApp) *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.telefono}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, telefono: e.target.value })}
                  placeholder="Ej. 5512345678"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico *</label>
                <input 
                  type="email" 
                  required
                  value={nuevoAlumno.correo}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, correo: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña Temporal *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.password}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
