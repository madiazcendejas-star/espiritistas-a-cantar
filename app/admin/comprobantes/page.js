'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ComprobantesAdminPage() {
  const [todosLosPagos, setTodosLosPagos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarTodoParaDiagnostico()
  }, [])

  const cargarTodoParaDiagnostico = async () => {
    setLoading(true)
    try {
      // 1. Traemos TODOS los pagos sin filtro para revisar qué hay en la base de datos
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Traemos todos los alumnos
      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('*')

      if (pagosError) throw pagosError

      if (pagosData) {
        const pagosConAlumno = pagosData.map(p => {
          const alumnoId = p.alumno_id || p.Alumno_id || p.alumnos_id
          const alumnoEncontrado = alumnosData?.find(a => Number(a.id) === Number(alumnoId)) || {}
          return {
            ...p,
            alumnos: alumnoEncontrado
          }
        })
        setTodosLosPagos(pagosConAlumno)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const aprobarYAplicarPago = async (pagoId) => {
    const confirmar = window.confirm('¿Estás seguro de aprobar este pago?')
    if (!confirmar) return

    const { error } = await supabase
      .from('pagos')
      .update({ estatus: 'Pagado', comprobante_url: null, url_comprobante: null })
      .eq('id', pagoId)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      alert('¡Pago aprobado con éxito!')
      cargarTodoParaDiagnostico()
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900 text-sm">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm">EC</div>
            <span className="font-bold text-white text-sm">Espiritistas a Cantar</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 text-sm font-medium">
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/comprobantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold shadow-sm">🧾 Comprobantes</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Diagnóstico y Validación de Comprobantes</h1>
            <p className="text-xs text-slate-500">Mostrando todos los registros de pago en la base de datos</p>
          </div>
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full">
            Total registros: {todosLosPagos.length}
          </span>
        </header>

        <div className="p-10 max-w-[1700px] mx-auto w-full space-y-6">
          {loading ? (
            <div className="text-center py-16 text-sm text-slate-400">Cargando registros...</div>
          ) : todosLosPagos.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-400 bg-white rounded-3xl border border-slate-200">
              No hay ningún registro en la tabla `pagos` de Supabase.
            </div>
          ) : (
            <div className="space-y-4">
              {todosLosPagos.map((p, idx) => {
                const monto = Number(p.monto || p.Monto || 0)
                const alumno = p.alumnos || {}
                const urlComp = p.comprobante_url || p.url_comprobante || p.Comprobante_url

                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-lg font-mono">
                          ID Pago: {p.id}
                        </span>
                        <span className="text-xs font-bold text-emerald-600">$ {monto} MXN</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                          Estatus: {p.estatus || 'Sin estatus'}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Alumno: {alumno.nombre || alumno.Nombre || `ID Alumno: ${p.alumno_id || 'Desconocido'}`}
                      </h4>
                      <p className="text-xs font-mono text-slate-500 truncate max-w-xl">
                        Comprobante URL: {urlComp ? urlComp : '⚠️ VACÍO / NULL EN SUPABASE'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {urlComp && (
                        <a 
                          href={urlComp} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold"
                        >
                          👁️ Ver Imagen
                        </a>
                      )}
                      <button 
                        onClick={() => aprobarYAplicarPago(p.id)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Aprobar Pago
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
