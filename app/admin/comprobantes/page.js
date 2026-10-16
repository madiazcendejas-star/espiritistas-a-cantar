'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ComprobantesAdminPage() {
  const [pagosPendientes, setPagosPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  // Estado para el modal de rechazo con nota
  const [pagoARechazar, setPagoARechazar] = useState(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')

  useEffect(() => {
    cargarComprobantes()
  }, [])

  const cargarComprobantes = async () => {
    setLoading(true)
    try {
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select('*')
        .order('id', { ascending: false })

      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('*')

      if (pagosError) throw pagosError

      if (pagosData) {
        const conComprobante = pagosData.filter(p => {
          const url = p.comprobante_url || p.url_comprobante || p.Comprobante_url
          return url && String(url).trim() !== ''
        })

        const pagosConAlumno = conComprobante.map(p => {
          const alumnoId = p.alumno_id || p.Alumno_id || p.alumnos_id
          const alumnoEncontrado = alumnosData?.find(a => String(a.id) === String(alumnoId)) || {}
          return {
            ...p,
            comprobante_url: p.comprobante_url || p.url_comprobante || p.Comprobante_url,
            alumnos: alumnoEncontrado
          }
        })

        setPagosPendientes(pagosConAlumno)
      }
    } catch (error) {
      alert('Error en admin: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Aprobar pago
  const aprobarYAplicarPago = async (pagoId) => {
    const confirmar = window.confirm('¿Estás seguro de aprobar y aplicar este pago?')
    if (!confirmar) return

    const { error } = await supabase
      .from('pagos')
      .update({ 
        estatus: 'Pagado', 
        comprobante_url: null,
        observaciones: 'Pago aprobado y validado por administración.'
      })
      .eq('id', pagoId)

    if (error) {
      alert('Error al aprobar: ' + error.message)
    } else {
      alert('¡Pago aprobado con éxito!')
      cargarComprobantes()
    }
  }

  // Rechazar pago con motivo
  const confirmarRechazo = async (e) => {
    e.preventDefault()
    if (!pagoARechazar || !motivoRechazo.trim()) {
      return alert('Por favor escribe el motivo del rechazo.')
    }

    try {
      const { error } = await supabase
        .from('pagos')
        .update({ 
          estatus: 'Pendiente', // Regresa a pendiente para que pueda subir otro
          comprobante_url: null, // Borramos el comprobante incorrecto
          observaciones: `Rechazado: ${motivoRechazo.trim()}`
        })
        .eq('id', pagoARechazar)

      if (error) throw error

      alert('Comprobante rechazado correctamente. El alumno podrá subir uno nuevo.')
      setPagoARechazar(null)
      setMotivoRechazo('')
      cargarComprobantes()
    } catch (error) {
      alert('Error al rechazar el pago: ' + error.message)
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
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-10 space-y-8">
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 shadow-xs rounded-3xl">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Validación de Comprobantes</h1>
            <p className="text-xs text-slate-500">Pendientes de revisión: {pagosPendientes.length}</p>
          </div>
          <button onClick={cargarComprobantes} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition">
            🔄 Recargar Datos
          </button>
        </header>

        {/* LISTADO DE COMPROBANTES */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Cargando...</div>
          ) : pagosPendientes.length === 0 ? (
            <div className="bg-white border border-slate-200 p-12 rounded-3xl text-center space-y-3">
              <h3 className="font-bold text-slate-800 text-base">🎉 ¡Todo al día! No hay comprobantes pendientes.</h3>
            </div>
          ) : (
            pagosPendientes.map((p, idx) => {
              const alumno = p.alumnos || {}
              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-slate-900">
                      {alumno.nombre || alumno.Nombre || `Alumno ID: ${p.alumno_id}`} — Cuota #{p.id} (${p.monto || p.Monto || 0} MXN)
                    </h4>
                    <p className="text-xs text-indigo-600 font-mono truncate max-w-xl">URL: {p.comprobante_url}</p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition">
                      👁️ Ver
                    </a>
                    <button 
                      onClick={() => setPagoARechazar(p.id)} 
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-bold transition border border-rose-200"
                    >
                      ❌ Rechazar
                    </button>
                    <button 
                      onClick={() => aprobarYAplicarPago(p.id)} 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      ✅ Aprobar
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* MODAL PARA MOTIVO DE RECHAZO */}
      {pagoARechazar && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Rechazar Comprobante</h3>
              <p className="text-xs text-slate-500 mt-1">Indica el motivo del rechazo. El alumno verá esta nota para corregir su envío.</p>
            </div>

            <form onSubmit={confirmarRechazo} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Motivo del rechazo *</label>
                <textarea 
                  required
                  rows={4}
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  placeholder="Ej. El comprobante está borroso, no coincide el monto o pertenece a otra fecha."
                  className="w-full p-4 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none focus:border-rose-500 font-medium resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => { setPagoARechazar(null); setMotivoRechazo(''); }} 
                  className="px-5 py-2.5 text-xs font-semibold text-slate-500"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-sm"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
