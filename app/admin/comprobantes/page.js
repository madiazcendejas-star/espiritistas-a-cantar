'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ComprobantesAdminPage() {
  const [pagosPendientes, setPagosPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarComprobantes()
  }, [])

  const cargarComprobantes = async () => {
    setLoading(true)
    try {
      // 1. Obtenemos todos los pagos sin filtros estrictos de estatus
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Obtenemos todos los alumnos
      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('*')

      if (pagosError) throw pagosError

      if (pagosData) {
        // Filtramos de forma segura cualquier pago que tenga un comprobante (verificando múltiples nombres posibles de columna)
        const conComprobante = pagosData.filter(p => {
          const url = p.comprobante_url || p.url_comprobante || p.Comprobante_url
          return url && typeof url === 'string' && url.trim() !== ''
        })

        // Cruzamos la información con el alumno correspondiente
        const resultadoFinal = conComprobante.map(p => {
          const alumnoId = p.alumno_id || p.Alumno_id || p.alumnos_id
          const alumnoEncontrado = alumnosData?.find(a => String(a.id) === String(alumnoId)) || {}
          return {
            ...p,
            comprobante_url: p.comprobante_url || p.url_comprobante || p.Comprobante_url,
            alumnos: alumnoEncontrado
          }
        })

        setPagosPendientes(resultadoFinal)
      }
    } catch (error) {
      console.error('Error al cargar comprobantes:', error)
    } finally {
      setLoading(false)
    }
  }

  const aprobarYAplicarPago = async (pagoId) => {
    const confirmar = window.confirm('¿Estás seguro de aprobar este comprobante y aplicar el pago al alumno?')
    if (!confirmar) return

    try {
      const { error } = await supabase
        .from('pagos')
        .update({ 
          estatus: 'Pagado',
          comprobante_url: null,
          url_comprobante: null 
        })
        .eq('id', pagoId)

      if (error) throw error

      alert('¡Pago aprobado y aplicado con éxito!')
      cargarComprobantes()
    } catch (error) {
      alert('Error al aprobar el pago: ' + error.message)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900 text-sm">
      
      {/* SIDEBAR ADMINISTRATIVO */}
      <aside className="w-72 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight">Espiritistas a Cantar</span>
              <span className="text-xs text-indigo-400 font-medium">Panel Administrativo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto text-sm font-medium">
          <div className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/calendario" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📅 Calendario</a>
          <a href="/admin/comprobantes" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold shadow-sm">🧾 Comprobantes</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
          
          <div className="pt-6 px-3 pb-2 text-xs uppercase tracking-wider text-indigo-400 font-bold">Presencial</div>
          <a href="/admin/tandas" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📍 Tandas y Misas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Validación de Comprobantes</h1>
            <p className="text-xs text-slate-500">Revisa los comprobantes enviados por los alumnos y aplícalos a sus cursos</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3.5 py-1.5 rounded-full">
            {pagosPendientes.length} pendientes de revisión
          </span>
        </header>

        <div className="p-10 max-w-[1700px] mx-auto w-full space-y-8">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Comprobantes Subidos por Alumnos</h3>
              <span className="text-xs text-slate-400 font-medium">Las imágenes se eliminan al aprobar para ahorrar espacio sin perder el registro</span>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sm text-slate-400">Cargando comprobantes...</div>
            ) : pagosPendientes.length === 0 ? (
              <div className="text-center py-16 text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                🎉 ¡Todo al día! No hay comprobantes pendientes por revisar en este momento.
              </div>
            ) : (
              <div className="space-y-4">
                {pagosPendientes.map((p, idx) => {
                  const monto = Number(p.monto || p.Monto || 0)
                  const alumno = p.alumnos || {}
                  const comprobanteUrl = p.comprobante_url

                  return (
                    <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-3 py-1 rounded-lg">
                            Monto: $ {monto.toLocaleString('es-MX')} MXN
                          </span>
                          <span className="text-xs text-slate-500 font-mono">Cuota #{p.id}</span>
                        </div>
                        <h4 className="text-base font-extrabold text-slate-900">
                          {alumno.nombre || alumno.Nombre || 'Estudiante'} <span className="text-xs font-normal text-slate-500">(Matrícula: #{alumno.matricula || 'N/A'})</span>
                        </h4>
                        <p className="text-xs text-slate-500">Correo: {alumno.correo || alumno.Correo || 'No registrado'}</p>
                      </div>

                      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                        {comprobanteUrl ? (
                          <a 
                            href={comprobanteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2"
                          >
                            <span>👁️</span> Ver Comprobante
                          </a>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl font-medium">Sin imagen adjunta</span>
                        )}

                        <button 
                          onClick={() => aprobarYAplicarPago(p.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
                        >
                          <span>✅</span> Aprobar y Aplicar Pago
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
