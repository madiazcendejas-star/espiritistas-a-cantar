'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function EstudiantesAdminPage() {
  const [alumnos, setAlumnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Formulario nuevo alumno
  const [nuevoAlumno, setNuevoAlumno] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    password: ''
  })

  useEffect(() => {
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

    const { error } = await supabase.from('alumnos').insert([
      {
        nombre: nuevoAlumno.nombre.trim(),
        correo: nuevoAlumno.correo.trim(),
        telefono: nuevoAlumno.telefono.trim(),
        password: nuevoAlumno.password.trim()
      }
    ])

    if (error) {
      alert('Error al registrar estudiante: ' + error.message)
    } else {
      setModalAbierto(false)
      setNuevoAlumno({ nombre: '', correo: '', telefono: '', password: '' })
      cargarAlumnos()
    }
    setGuardando(false)
  }

  const cerrarSesion = () => {
    localStorage.removeItem('eac_sesion')
    window.location.href = '/'
  }

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
          <a href="/admin/cursos" className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">
            <span>📚</span> Programas / Cursos
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

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
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

        {/* Contenedor de la Vista */}
        <div className="p-8 max-w-[1400px] mx-auto w-full space-y-6">
          
          {/* Barra de Acciones */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">Gestione los expedientes y credenciales de acceso de los alumnos.</p>
            <button 
              onClick={() => setModalAbierto(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
            >
              <span>+</span> Nuevo Estudiante
            </button>
          </div>

          {/* Tabla de Estudiantes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-slate-400 text-sm">Cargando directorio de estudiantes...</div>
            ) : alumnos.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No hay estudiantes registrados en Supabase.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-4 px-6">ID</th>
                      <th className="py-4 px-6">Nombre Completo</th>
                      <th className="py-4 px-6">Correo Electrónico</th>
                      <th className="py-4 px-6">Teléfono / Usuario</th>
                      <th className="py-4 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {alumnos.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6 font-semibold text-slate-900">#{a.id}</td>
                        <td className="py-4 px-6 font-bold text-slate-900">{a.nombre}</td>
                        <td className="py-4 px-6 text-slate-500">{a.correo || 'No especificado'}</td>
                        <td className="py-4 px-6 font-medium text-indigo-600">{a.telefono || 'No especificado'}</td>
                        <td className="py-4 px-6 text-right">
                          <button 
                            onClick={() => alert(`Estudiante: ${a.nombre}\nCorreo: ${a.correo}\nTeléfono: ${a.telefono}`)}
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
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Inscribir Nuevo Estudiante</h3>
            <p className="text-xs text-slate-400 mb-6">Cree el expediente y credenciales de acceso LMS.</p>

            <form onSubmit={registrarAlumno} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nombre Completo *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.nombre}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, nombre: e.target.value })}
                  placeholder="Ej. María Fernanda Rivas"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  value={nuevoAlumno.correo}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, correo: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Teléfono (Usuario de Acceso) *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.telefono}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, telefono: e.target.value })}
                  placeholder="Ej. 5632087410"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contraseña Inicial *</label>
                <input 
                  type="text" 
                  required
                  value={nuevoAlumno.password}
                  onChange={(e) => setNuevoAlumno({ ...nuevoAlumno, password: e.target.value })}
                  placeholder="Contraseña para el portal del alumno"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-600 outline-none bg-slate-50"
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
                  {guardando ? 'Guardando...' : 'Inscribir Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
