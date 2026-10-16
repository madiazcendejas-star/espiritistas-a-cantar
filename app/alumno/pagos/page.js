'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function AlumnoPagosPage() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [archivoComprobante, setArchivoComprobante] = useState(null)

  // Nota: Aquí puedes obtener el ID del alumno logueado desde tu sesión, localStorage o contexto de autenticación.
  // Simularemos un alumno_id (ej. el alumno con ID 1 o almacenado en localStorage).
  const [alumnoId, setAlumnoId] = useState(null)

  useEffect(() => {
    // Ejemplo: obtener alumno autenticado de localStorage o sesión
    const storedUser = localStorage.getItem('alumno_id') || '1' 
    setAlumnoId(storedUser)
    if (storedUser) {
      cargarPagosAlumno(storedUser)
    }
  }, [])

  const cargarPagosAlumno = async (idAlu) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('alumno_id', idAlu)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setPagos(data)
    }
    setLoading(false)
  }

  const enviarComprobante = async (e) => {
    e.preventDefault()
    if (!archivoComprobante || !pagoSeleccionado) {
      alert('Por favor selecciona un archivo de comprobante.')
      return
    }

    setSubiendo(true)

    try {
      // 1. Subir la imagen al Storage de Supabase (asumiendo un bucket llamado 'comprobantes')
      const fileName = `comprobante_${pagoSeleccionado}_${Date.now()}.${archivoComprobante.name.split('.').pop()}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, archivoComprobante)

      if (uploadError) throw uploadError

      // 2. Obtener la URL pública del archivo subido
      const { data: urlData } = supabase.storage
        .from('comprobantes')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl

      // 3. Actualizar el registro de pago con la URL y cambiar estatus a 'Revision'
      const { error: updateError } = await supabase
        .from('pagos')
        .update({
          comprobante_url: publicUrl,
          estatus: 'Revision'
        })
        .eq('id', pagoSeleccionado)

      if (updateError) throw updateError

      alert('¡Comprobante enviado exitosamente! El administrador lo revisará pronto.')
      setPagoSeleccionado(null)
      setArchivoComprobante(null)
      cargarPagosAlumno(alumnoId)

    } catch (error) {
      alert('Error al subir el comprobante: ' + error.message)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 text-sm">
      
      {/* HEADER DEL PORTAL */}
      <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900">Portal del Estudiante</h1>
            <p className="text-xs text-slate-500">Mis Pagos y Comprobantes</p>
          </div>
        </div>
        <a href="/alumno/login" className="text-xs font-semibold text-rose-600 hover:underline">Cerrar Sesión</a>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="p-10 max-w-[1200px] mx-auto w-full space-y-8">
        
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Estado de Cuenta y Cuotas</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-3 py-1.5 rounded-xl">Espiritistas a Cantar</span>
          </div>

          {loading ? (
            <div className="text-center py-16 text-sm text-slate-400">Cargando tus pagos...</div>
          ) : pagos.length === 0 ? (
            <div className="text-center py-16 text-sm text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No tienes pagos o cuotas registradas por el momento.
            </div>
          ) : (
            <div className="space-y-4">
              {pagos.map((p, idx) => {
                const monto = Number(p.monto || p.Monto || 0)
                const estatus = p.estatus || p.Estatus || 'Pendiente'
                const fechaVence = p.fecha_vencimiento || 'Sin fecha'

                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">Cuota #{p.id}</span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          estatus === 'Pagado' ? 'bg-emerald-50 text-emerald-700' :
                          estatus === 'Revision' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {estatus === 'Pagado' ? 'Pagado' : estatus === 'Revision' ? 'En Revisión' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Vencimiento: {fechaVence}</p>
                    </div>

                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-base font-extrabold text-slate-900">$ {monto.toLocaleString('es-MX')} MXN</span>
                      
                      {estatus !== 'Pagado' && estatus !== 'Revision' && (
                        <button 
                          onClick={() => setPagoSeleccionado(p.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          Subir Comprobante
                        </button>
                      )}

                      {estatus === 'Revision' && (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-xl">Validando...</span>
                      )}

                      {estatus === 'Pagado' && (
                        <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-3 py-1.5 rounded-xl">✓ Aprobado</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* MODAL PARA SUBIR ARCHIVO */}
      {pagoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Subir Comprobante de Pago</h3>
              <p className="text-xs text-slate-500 mt-1">Selecciona la imagen de tu ticket o transferencia (JPG o PNG).</p>
            </div>

            <form onSubmit={enviarComprobante} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-2">Archivo de Comprobante *</label>
                <input 
                  type="file" 
                  accept="image/*"
                  required
                  onChange={(e) => setArchivoComprobante(e.target.files[0])}
                  className="w-full p-3 border border-slate-200 rounded-2xl text-xs bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setPagoSeleccionado(null)} 
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={subiendo} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50"
                >
                  {subiendo ? 'Subiendo...' : 'Enviar Comprobante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
