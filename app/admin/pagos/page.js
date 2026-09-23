'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function PagosAdminPage() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [stats, setStats] = useState({
    vencidosCount: 0,
    vencidosMonto: 0,
    totalCobrado: 0,
    totalPendiente: 0,
    tasaCobro: 0
  })

  useEffect(() => {
    cargarPagos()
  }, [])

  const cargarPagos = async () => {
    setLoading(true)

    // Cargar tablas de forma independiente para evitar fallos de relaciones en Supabase
    const { data: resPagos } = await supabase.from('pagos').select('*').order('fecha_vencimiento', { ascending: false })
    const { data: resAlumnos } = await supabase.from('alumnos').select('*')
    const { data: resGrupos } = await supabase.from('grupos').select('*')
    const { data: resCursos } = await supabase.from('cursos').select('*')

    if (resPagos && resAlumnos && resGrupos && resCursos) {
      const pagosMapeados = resPagos.map(p => {
        const al = resAlumnos.find(a => Number(a.id) === Number(p.alumno_id))
        const gr = resGrupos.find(g => Number(g.id) === Number(p.grupo_id))
        const cur = gr ? resCursos.find(c => Number(c.id) === Number(gr.curso_id)) : (p.curso_id ? resCursos.find(c => Number(c.id) === Number(p.curso_id)) : null)

        return {
          id: p.id,
          monto: Number(p.monto) || 0,
          fecha_vencimiento: p.fecha_vencimiento || 'Sin fecha',
          estatus: p.estatus || 'Pendiente',
          alumnoNombre: al?.nombre || al?.Nombre || 'Estudiante',
          alumnoCorreo: al?.correo || al?.Correo || 'Sin mail',
          alumnoMatricula: al?.matricula || `EAC-${al?.id}`,
          cursoNombre: cur?.Nombre_curso || cur?.nombre_curso || 'Curso',
          grupoNombre: gr?.nombre_grupo || 'Grupo'
        }
      })

      setPagos(pagosMapeados)
      calcularMetricas(pagosMapeados)
    }

    setLoading(false)
  }

  const calcularMetricas = (listaPagos) => {
    let vencidosC = 0
    let vencidosM = 0
    let cobrado = 0
    let pendiente = 0
    let totalGeneral = listaPagos.length

    const hoy = new Date().toISOString().split('T')[0]

    listaPagos.forEach(p => {
      const monto = Number(p.monto) || 0
      const estatus = p.estatus || 'Pendiente'

      if (estatus === 'Pagado') {
        cobrado += monto
      } else {
        pendiente += monto
        if (p.fecha_vencimiento < hoy || estatus === 'Vencido') {
          vencidosC++
          vencidosM += monto
        }
      }
    })

    const pagadosCount = listaPagos.filter(p => p.estatus === 'Pagado').length
    const tasa = totalGeneral > 0 ? ((pagadosCount / totalGeneral) * 100).toFixed(1) : 0

    setStats({
      vencidosCount: vencidosC,
      vencidosMonto: vencidosM,
      totalCobrado: cobrado,
      totalPendiente: pendiente,
      tasaCobro: tasa
    })
  }

  const marcarComoPagado = async (id) => {
    const confirmar = confirm('¿Deseas registrar este pago como Pagado?')
    if (!confirmar) return

    const hoy = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('pagos')
      .update({ estatus: 'Pagado', fecha_pago: hoy })
      .eq('id', id)

    if (error) {
      alert('Error al actualizar pago: ' + error.message)
    } else {
      alert('¡Pago registrado exitosamente!')
      cargarPagos()
    }
  }

  const pagosFiltrados = pagos.filter(p => {
    const termino = busqueda.toLowerCase()
    return p.alumnoNombre.toLowerCase().includes(termino) ||
           p.alumnoMatricula.toLowerCase().includes(termino) ||
           p.cursoNombre.toLowerCase().includes(termino) ||
           p.grupoNombre.toLowerCase().includes(termino)
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
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
          <h2 className="text-sm font-bold text-slate-800">Gestión de Pagos Programados</h2>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">Sincronizado con Supabase</span>
        </header>

        <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Pagos Pendientes / Vencidos</span>
                <h3 className="text-2xl font-extrabold text-rose-600 mt-1">{stats.vencidosCount}</h3>
                <span className="text-[11px] text-slate-400">$ {stats.vencidosMonto.toLocaleString('es-MX')} MXN</span>
              </div>
              <span className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-lg">⚠️</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Saldo Pendiente Total</span>
                <h3 className="text-2xl font-extrabold text-amber-600 mt-1">$ {stats.totalPendiente.toLocaleString('es-MX')}</h3>
                <span className="text-[11px] text-slate-400">Por cobrar</span>
              </div>
              <span className="p-3 bg-amber-50 text-amber-600 rounded-2xl text-lg">⏳</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Total Cobrado</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">$ {stats.totalCobrado.toLocaleString('es-MX')}</h3>
                <span className="text-[11px] text-slate-400">Ingresos reales</span>
              </div>
              <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-lg">💳</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Tasa de Cobro</span>
                <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{stats.tasaCobro}%</h3>
                <span className="text-[11px] text-slate-400">Efectividad</span>
              </div>
              <span className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl text-lg">📈</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
            <span className="text-slate-400 text-sm pl-2">🔍</span>
            <input 
              type="text" 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por estudiante, matrícula, curso o grupo..." 
              className="w-full text-xs outline-none bg-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Historial de Cuotas y Pagos ({pagosFiltrados.length})</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16 text-xs text-slate-400">Cargando registros financieros...</div>
              ) : pagosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">No hay pagos registrados en la base de datos.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-6">ID / Matrícula</th>
                      <th className="py-3 px-6">Estudiante</th>
                      <th className="py-3 px-6">Descripción (Curso / Grupo)</th>
                      <th className="py-3 px-6">Vencimiento</th>
                      <th className="py-3 px-6">Monto</th>
                      <th className="py-3 px-6">Estado</th>
                      <th className="py-3 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {pagosFiltrados.map((p) => {
                      const estatus = p.estatus || 'Pendiente'

                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition">
                          <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                            #PAG-{p.id}
                            <div className="text-[10px] text-slate-400">#{p.alumnoMatricula}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900">{p.alumnoNombre}</div>
                            <span className="text-[10px] text-slate-400">{p.alumnoCorreo}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-800">{p.cursoNombre}</div>
                            <span className="text-[11px] text-indigo-600">{p.grupoNombre}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-500">
                            {p.fecha_vencimiento}
                          </td>
                          <td className="py-4 px-6 font-extrabold text-slate-900">
                            $ {Number(p.monto).toLocaleString('es-MX')} MXN
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${estatus === 'Pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {estatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {estatus === 'Pagado' ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">✓ Pagado</span>
                            ) : (
                              <button 
                                onClick={() => marcarComoPagado(p.id)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-semibold transition shadow-sm"
                              >
                                Registrar pago
                              </button>
                            )}
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

    </div>
  )
}
