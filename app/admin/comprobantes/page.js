'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function ComprobantesAdminPage() {
  const [pagosPendientes, setPagosPendientes] = useState([])
  const [debugRaw, setDebugRaw] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarComprobantes()
  }, [])

  const cargarComprobantes = async () => {
    setLoading(true)
    try {
      // Traemos TODO de la tabla pagos directamente sin filtros ocultos
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: alumnosData } = await supabase
        .from('alumnos')
        .select('*')

      if (pagosError) throw pagosError

      if (pagosData) {
        setDebugRaw(pagosData) // Guardamos los datos crudos para verlos en pantalla

        // Filtramos cualquier pago que tenga texto en comprobante_url
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

  const aprobarYAplicarPago = async (pagoId) => {
    const confirmar = window.confirm('¿Aprobar y aplicar este pago?')
    if (!confirmar) return

    const { error } = await supabase
      .from('pagos')
      .update({ estatus: 'Pagado', comprobante_url: null, url_comprobante: null })
      .eq('id', pagoId)

    if (error) {
      alert('Error al aprobar: ' + error.message)
    } else {
      alert('¡Pago aprobado con éxito!')
      cargarComprobantes()
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
            <h1 className="text-lg font-extrabold text-slate-900">Validación de Comprobantes (Modo Diagnóstico)</h1>
            <p className="text-xs text-slate-500">Filtrados detectados: {pagosPendientes.length} | Total en tabla pagos: {debugRaw.length}</p>
          </div>
          <button onClick={cargarComprobantes} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
            🔄 Recargar Datos
          </button>
        </header>

        {/* LISTADO DE COMPROBANTES DETECTADOS */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Cargando...</div>
          ) : pagosPendientes.length === 0 ? (
            <div className="bg-rose-50 border border-rose-200 p-8 rounded-3xl text-center space-y-3">
              <h3 className="font-bold text-rose-900 text-base">El filtro no encontró pagos con URL de comprobante.</h3>
              <p className="text-xs text-rose-700">Revisa la caja de diagnóstico abajo para ver si los datos están llegando desde Supabase.</p>
            </div>
          ) : (
            pagosPendientes.map((p, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 flex justify-between items-center shadow-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900">Cuota #{p.id} - ${p.monto} MXN (Alumno ID: {p.alumno_id})</h4>
                  <p className="text-xs text-indigo-600 font-mono truncate max-w-xl">URL: {p.comprobante_url}</p>
                </div>
                <div className="flex gap-3">
                  <a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold">👁️ Ver</a>
                  <button onClick={() => aprobarYAplicarPago(p.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold">✅ Aprobar</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* CAJA DE DIAGNÓSTICO VISIBLE */}
        <div className="bg-slate-900 text-emerald-400 p-6 rounded-3xl font-mono text-xs space-y-2 overflow-x-auto">
          <h4 className="text-white font-bold uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
            🛠️ Consola de Diagnóstico (Todos los registros obtenidos de la tabla pagos en Supabase):
          </h4>
          <pre>{JSON.stringify(debugRaw, null, 2)}</pre>
        </div>
      </main>
    </div>
  )
}
