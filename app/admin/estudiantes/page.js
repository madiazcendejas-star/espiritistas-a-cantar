'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function EstudiantesAdminPage() {
  const [alumnos, setAlumnos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario nuevo estudiante con todos los campos requeridos
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    fecha_nacimiento: '',
    estado: '',
    cp: '',
    pais: 'México',
    password: ''
  })

  useEffect(() => {
    const sesion = localStorage.getItem('eac_sesion')
    if (!sesion || JSON.parse(sesion).rol !== 'admin') {
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

  // Generar matrícula única de 4 dígitos
  const generarMatricula4Digitos = () => {
    return Math.floor(1000 + Math.random() * 9000).toString()
  }

  const registrarEstudiante = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const matriculaUnica = generarMatricula4Digitos()
    const passwordGenerada = nuevoAlumno.password.trim() || 'EAC2026*'

    const { error } = await supabase.from('alumnos').insert([
      {
        matricula: matriculaUnica,
        nombre: nuevoAlumno.nombre.trim(),
        telefono: nuevoAlumno.telefono.trim(),
        correo: nuevoAlumno.correo.trim(),
        fecha_nacimiento: nuevoAlumno.fecha_nacimiento || null,
        estado: nuevoAlumno.estado.trim(),
        cp: nuevoAlumno.cp.trim(),
        pais: nuevoAlumno.pais.trim(),
        password: passwordGenerada
      }
    ])

    if (error) {
      alert('Error al registrar estudiante: ' + error.message)
    } else {
      setModalAbierto(false)
      setNuevoAlumno({
        nombre: '',
        telefono: '',
        correo: '',
        fecha_nacimiento: '',
        estado: '',
        cp: '',
        pais: 'México',
        password: ''
      })
      cargarAlumnos()
    }
    setGuardando(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

  // Buscador dinámico por nombre, apellido, teléfono, matrícula o correo
  const alumnosFiltrados = alumnos.filter((a) => {
    const query = busqueda.toLowerCase()
    const nombre = (a.nombre || '').toLowerCase()
    const telefono = (a.telefono || '').toLowerCase()
    const correo = (a.correo || '').toLowerCase()
    const matricula = (a.matricula || a.id?.toString() || '').toLowerCase()

    return (
      nombre.includes(query) ||
      telefono.includes(query) ||
      correo.includes(query) ||
      matricula.includes(query)
    )
  })

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR INSTITUCIONAL */}
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
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        {/* Barra Superior con Buscador Dinámico */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4 w-full max-w-lg">
            <div className="relative w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-xs">🔍</span>
              <input 
                type="text" 
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, apellido, teléfono, matrícula o correo..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 transition"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-600">Control Escolar</span>
          </div>
        </header>

        {/* CONTENEDOR DE LA VISTA */}
        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
          
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Directorio de Estudiantes</h1>
              <p className="text-xs text-slate-500 mt-0.5">Gestión y expedientes del alumnado activo en la academia.</p>
            </div>
            <button 
              onClick={() => setModalAbierto(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <span>+</span> Nuevo Estudiante
            </button>
          </div>

          {/* TABLA DE ALUMNOS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-xs">Cargando directorio de estudiantes...</div>
            ) : alumnosFiltrados.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">No se encontraron estudiantes con ese criterio de búsqueda.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Matrícula</th>
                      <th className="py-4 px-6">Nombre Completo</th>
                      <th className="py-4 px-6">Teléfono</th>
                      <th className="py-4 px-6">Correo</th>
                      <th className="py-4 px-6">Ubicación (Estado / CP)</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {alumnosFiltrados.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                          #{a.matricula || `EAC-${a.id}`}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-900">{a.nombre}</td>
                        <td className="py-4 px-6 text-slate-600">{a.telefono || 'Sin teléfono'}</td>
                        <td className="py-4 px-6 text-slate-500">{a.correo || 'Sin correo'}</td>
                        <td className="py-4 px-6 text-slate-500">
                          {a.estado ? `${a.estado} (CP: ${a.cp || 'N/A'})` : 'No especificado'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => alert(`Expediente de ${a.nombre}\nMatrícula: ${a.matricula}\nTeléfono: ${a.telefono}`)}
                            className="text-indigo-600 font-semibold hover:underline"
                          >
                            Ver Expediente
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL NUEVO ESTUDIANTE */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Inscribir Nuevo Estudiante</h3>
              <p className="text-xs text-slate-400 mt-0.5">El sistema asignará automáticamente una matrícula única de 4 dígitos.</p>
            </div>

            <form onSubmit={registrarEstudiante} className="space-y-4">
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.nombre}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })}
                  placeholder="Ej. Roberto Carlos Mendoza"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono *</label>
                  <input 
                    type="text" 
                    required
                    value={nuevoAlumno.telefono}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, telefono: e.target.value })}
                    placeholder="Ej. 5512345678"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={nuevoAlumno.correo}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, correo: e.target.value })}
                    placeholder="correo@ejemplo.com"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Fecha de Nacimiento</label>
                  <input 
                    type="date" 
                    value={nuevoAlumno.fecha_nacimiento}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, fecha_nacimiento: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña de Acceso LMS</label>
                  <input 
                    type="text" 
                    value={nuevoAlumno.password}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, password: e.target.value })}
                    placeholder="Contraseña inicial (opcional)"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
              </div>

              {/* Información de Dirección: Estado, CP y País */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Estado</label>
                  <input 
                    type="text" 
                    value={nuevoAlumno.estado}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, estado: e.target.value })}
                    placeholder="Ej. Estado de México"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">C.P.</label>
                  <input 
                    type="text" 
                    value={nuevoAlumno.cp}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, cp: e.target.value })}
                    placeholder="54900"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">País</label>
                  <input 
                    type="text" 
                    value={nuevoAlumno.pais}
                    onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, pais: e.target.value })}
                    placeholder="México"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 bg-slate-50"
                  />
                </div>
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Crear Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
