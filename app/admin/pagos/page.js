'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function PagosAdminPage() {
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos', 'vencidos', 'pendiente', 'pagado', 'cancelado'

  // Modal para reprogramar fecha
  const [modalFecha, setModalFecha] = useState(false)
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null)
  const [nuevaFecha, setNuevaFecha] = useState('')
  const [desplazarResto, setDesplazarResto] = useState(true)
  const [guardandoFecha, setGuardandoFecha] = useState(false)

  // Modal para registrar pago avanzado (Adelantos, Becas, Descuentos)
  const [modalPago, setModalPago] = useState(false)
  const [montoPagadoReal, setMontoPagadoReal] = useState('')
  const [tipoMovimiento, setTipoMovimiento] = useState('normal')
  const [guardandoPago, setGuardandoPago] = useState(false)

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

    const { data: resPagos } = await supabase.from('pagos').select('*').order('fecha_vencimiento', { ascending: true })
    const { data: resAlumnos } = await supabase.from('alumnos').select('*')
    const { data: resGrupos } = await supabase.from('grupos').select('*')
    const { data: resCursos } = await supabase.from('cursos').select('*')

    if (resPagos && resAlumnos && resGrupos && resCursos) {
      const hoyStr = new Date().toISOString().split('T')[0]

      const pagosMapeados = resPagos.map(p => {
        const al = resAlumnos.find(a => Number(a.id) === Number(p.alumno_id))
        const gr = resGrupos.find(g => Number(g.id) === Number(p.grupo_id))
        const cur = gr ? resCursos.find(c => Number(c.id) === Number(gr.curso_id)) : (p.curso_id ? resCursos.find(c => Number(c.id) === Number(p.curso_id)) : null)

        // Validar si el alumno está dado de baja (buscando en estatus o activo)
        const estatusAlumno = al?.estatus || al?.Estatus || (al?.activo === false ? 'Baja' : 'Activo')
        const esBaja = String(estatusAlumno).toLowerCase().includes('baja') || al?.activo === false

        const estatusOriginal = p.estatus || 'Pendiente'
        
        // Si el alumno está de baja, el pago pendiente pasa automáticamente a estatus "Cancelado" / inactivo para cobro
        const estatusFinal = esBaja && estatusOriginal !== 'Pagado' ? 'Cancelado' : estatusOriginal
        const esVencido = estatusFinal === 'Pendiente' && p.fecha_vencimiento && p.fecha_vencimiento < hoyStr

        return {
          id: p.id,
          alumno_id: p.alumno_id,
          grupo_id: p.grupo_id,
          monto: Number(p.monto) || 0,
          monto_real: (p.monto_real !== null && p.monto_real !== undefined) ? Number(p.monto_real) : (Number(p.monto) || 0),
          fecha_vencimiento: p.fecha_vencimiento || 'Sin fecha',
          estatus: estatusFinal,
          estaBaja: esBaja,
          estaVencido: esVencido,
          alumnoNombre: al?.nombre || al?.Nombre || 'Estudiante',
          alumnoCorreo: al?.correo || al?.Correo || 'Sin mail',
          alumnoTelefono: al?.telefono || al?.Telefono || '',
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
    let totalGeneral = listaPagos.filter(p => p.estatus !== 'Cancelado').length

    listaPagos.forEach(p => {
      // Ignorar totalmente los pagos de alumnos dados de baja en las métricas de cobro
      if (p.estatus === 'Cancelado') return

      const montoOficial = Number(p.monto) || 0
      const montoReal = p.monto_real !== undefined ? Number(p.monto_real) : montoOficial

      if (p.estatus === 'Pagado') {
        cobrado += montoReal
      } else {
        pendiente += montoOficial
        if (p.estaVencido) {
          vencidosC++
          vencidosM += montoOficial
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

  const abrirModalPago = (pago) => {
    if (pago.estaBaja) {
      return alert('No se puede registrar pago a un alumno que se encuentra dado de baja.')
    }
    setPagoSeleccionado(pago)
    setMontoPagadoReal(pago.monto)
    setTipoMovimiento('normal')
    setModalPago(true)
  }

  const procesarPagoAvanzado = async (e) => {
    e.preventDefault()
    if (!pagoSeleccionado) return

    setGuardandoPago(true)
    const hoy = new Date().toISOString().split('T')[0]
    const montoCuotaOriginal = Number(pagoSeleccionado.monto)
    const montoEntregado = tipoMovimiento === 'beca' ? 0 : Number(montoPagadoReal)

    const { error: errUpdate } = await supabase
      .from('pagos')
      .update({ 
        estatus: 'Pagado', 
        fecha_pago: hoy,
        monto_real: montoEntregado 
      })
      .eq('id', pagoSeleccionado.id)

    if (errUpdate) {
      setGuardandoPago(false)
      return alert('Error al registrar el pago: ' + errUpdate.message)
    }

    if (montoEntregado > montoCuotaOriginal) {
      const sobrante = montoEntregado - montoCuotaOriginal
      
      const { data: siguientePago } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', pagoSeleccionado.alumno_id)
        .eq('grupo_id', pagoSeleccionado.grupo_id)
        .eq('estatus', 'Pendiente')
        .order('fecha_vencimiento', { ascending: true })
        .limit(1)

      if (siguientePago && siguientePago.length > 0) {
        const sig = siguientePago[0]
        const nuevoMontoSig = Math.max(0, Number(sig.monto) - sobrante)
        
        await supabase
          .from('pagos')
          .update({ monto: nuevoMontoSig })
          .eq('id', sig.id)
        
        alert(`¡Pago registrado! Se detectó un adelanto de $${sobrante}. Se ha descontado automáticamente al siguiente pago pendiente del alumno.`)
      }
    }

    const telLimpio = pagoSeleccionado.alumnoTelefono ? String(pagoSeleccionado.alumnoTelefono).replace(/\D/g, '') : ''
    if (telLimpio) {
      const mensaje = `¡Hola *${pagoSeleccionado.alumnoNombre}*! Te confirmamos que tu pago por *$${montoEntregado.toLocaleString('es-MX')} MXN* para el curso *${pagoSeleccionado.cursoNombre}* ha sido registrado con éxito. ¡Gracias!`
      const urlWa = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
      window.open(urlWa, '_blank')
    }

    setModalPago(false)
    setPagoSeleccionado(null)
    setGuardandoPago(false)
    cargarPagos()
  }

  const enviarRecordatorioWhatsApp = (pago) => {
    if (pago.estaBaja) {
      return alert('Este alumno está dado de baja, no se le pueden enviar recordatorios de cobro.')
    }
    const telLimpio = pago.alumnoTelefono ? String(pago.alumnoTelefono).replace(/\D/g, '') : ''
    if (!telLimpio) {
      return alert('Este alumno no tiene un número de teléfono registrado para WhatsApp.')
    }
    const mensaje = `¡Hola *${pago.alumnoNombre}*! Te saludamos de Espíritas a Cantar. Te recordamos que tienes un pago vencido por la cantidad de *$${pago.monto.toLocaleString('es-MX')} MXN* correspondiente al curso *${pago.cursoNombre}* (vencimiento: ${pago.fecha_vencimiento}). Por favor, confírmanos tu comprobante por este medio para mantener tu acceso al corriente. ¡Gracias!`
    const urlWa = `https://wa.me/${telLimpio}?text=${encodeURIComponent(mensaje)}`
    window.open(urlWa, '_blank')
  }

  const abrirModalFecha = (pago) => {
    if (pago.estaBaja) return alert('No se pueden modificar fechas a alumnos dados de baja.')
    setPagoSeleccionado(pago)
    setNuevaFecha(pago.fecha_vencimiento)
    setDesplazarResto(true)
    setModalFecha(true)
  }

  const guardarNuevaFecha = async (e) => {
    e.preventDefault()
    if (!pagoSeleccionado || !nuevaFecha) return

    setGuardandoFecha(true)

    const fechaAntigua = new Date(pagoSeleccionado.fecha_vencimiento)
    const fechaNueva = new Date(nuevaFecha)
    
    const diferenciaMs = fechaNueva.getTime() - fechaAntigua.getTime()
    const diferenciaDias = Math.round(diferenciaMs / (1000 * 60 * 60 * 24))

    const { error: err1 } = await supabase
      .from('pagos')
      .update({ fecha_vencimiento: nuevaFecha })
      .eq('id', pagoSeleccionado.id)

    if (err1) {
      setGuardandoFecha(false)
      return alert('Error al actualizar fecha: ' + err1.message)
    }

    if (desplazarResto && diferenciaDias !== 0) {
      const { data: pagosPosteriores } = await supabase
        .from('pagos')
        .select('*')
        .eq('alumno_id', pagoSeleccionado.alumno_id)
        .eq('grupo_id', pagoSeleccionado.grupo_id)
        .eq('estatus', 'Pendiente')
        .gt('fecha_vencimiento', pagoSeleccionado.fecha_vencimiento)

      if (pagosPosteriores && pagosPosteriores.length > 0) {
        for (let p of pagosPosteriores) {
          const fActual = new Date(p.fecha_vencimiento)
          fActual.setDate(fActual.getDate() + diferenciaDias)
          const nuevaFStr = fActual.toISOString().split('T')[0]

          await supabase
            .from('pagos')
            .update({ fecha_vencimiento: nuevaFStr })
            .eq('id', p.id)
        }
      }
    }

    alert('¡Fechas de vencimiento reprogramadas con éxito!')
    setModalFecha(false)
    setPagoSeleccionado(null)
    setGuardandoFecha(false)
    cargarPagos()
  }

  // Filtrado combinado por búsqueda de texto y botones de estado
  const pagosFiltrados = pagos.filter(p => {
    const termino = busqueda.toLowerCase()
    const coincideTexto = p.alumnoNombre.toLowerCase().includes(termino) ||
                           p.alumnoMatricula.toLowerCase().includes(termino) ||
                           p.cursoNombre.toLowerCase().includes(termino) ||
                           p.grupoNombre.toLowerCase().includes(termino)

    if (!coincideTexto) return false

    if (filtroEstado === 'vencidos') return p.estaVencido
    if (filtroEstado === 'pendiente') return p.estatus === 'Pendiente' && !p.estaVencido
    if (filtroEstado === 'pagado') return p.estatus === 'Pagado'
    if (filtroEstado === 'cancelado') return p.estatus === 'Cancelado'

    return true // 'todos'
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
                <span className="text-xs font-bold text-slate-400 uppercase">Pagos Vencidos</span>
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
                <span className="text-xs font-bold text-slate-400 uppercase">Total Cobrado Real</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">$ {stats.totalCobrado.toLocaleString('es-MX')}</h3>
                <span className="text-[11px] text-slate-400">Ingresos netos (con becas/descuentos)</span>
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

          {/* BARRA DE BÚSQUEDA Y FILTROS RÁPIDOS */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroEstado === 'todos' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                📋 Todos ({pagos.length})
              </button>
              <button 
                onClick={() => setFiltroEstado('vencidos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroEstado === 'vencidos' ? 'bg-rose-600 text-white shadow-sm' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50'}`}
              >
                ⚠️ Vencidos ({pagos.filter(p => p.estaVencido).length})
              </button>
              <button 
                onClick={() => setFiltroEstado('pendiente')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroEstado === 'pendiente' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'}`}
              >
                ⏳ Al corriente ({pagos.filter(p => p.estatus === 'Pendiente' && !p.estaVencido).length})
              </button>
              <button 
                onClick={() => setFiltroEstado('pagado')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroEstado === 'pagado' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50'}`}
              >
                ✓ Pagados ({pagos.filter(p => p.estatus === 'Pagado').length})
              </button>
              <button 
                onClick={() => setFiltroEstado('cancelado')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroEstado === 'cancelado' ? 'bg-slate-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
              >
                🚫 Bajas / Cancelados ({pagos.filter(p => p.estatus === 'Cancelado').length})
              </button>
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
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900">Historial de Cuotas y Pagos ({pagosFiltrados.length})</h3>
            </div>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="text-center py-16 text-xs text-slate-400">Cargando registros financieros...</div>
              ) : pagosFiltrados.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-400">No hay pagos que coincidan con los filtros seleccionados.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                      <th className="py-3 px-6">ID / Matrícula</th>
                      <th className="py-3 px-6">Estudiante</th>
                      <th className="py-3 px-6">Descripción (Curso / Grupo)</th>
                      <th className="py-3 px-6">Vencimiento</th>
                      <th className="py-3 px-6">Monto Oficial</th>
                      <th className="py-3 px-6">Estado</th>
                      <th className="py-3 px-6 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {pagosFiltrados.map((p) => {
                      const estatus = p.estatus
                      const estaVencido = p.estaVencido
                      const esBaja = p.estaBaja

                      return (
                        <tr key={p.id} className={`hover:bg-slate-50 transition ${esBaja ? 'opacity-70 bg-slate-50/50' : ''}`}>
                          <td className="py-4 px-6 font-mono font-bold text-indigo-600">
                            #PAG-{p.id}
                            <div className="text-[10px] text-slate-400">#{p.alumnoMatricula}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                              {p.alumnoNombre}
                              {esBaja && <span className="bg-slate-200 text-slate-700 text-[9px] px-2 py-0.5 rounded-full font-bold">BAJA</span>}
                            </div>
                            <span className="text-[10px] text-slate-400">{p.alumnoCorreo}</span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-800">{p.cursoNombre}</div>
                            <span className="text-[11px] text-indigo-600">{p.grupoNombre}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-500 flex items-center gap-2">
                            <span>{p.fecha_vencimiento}</span>
                            {!esBaja && estatus !== 'Pagado' && (
                              <button 
                                onClick={() => abrirModalFecha(p)} 
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded transition"
                                title="Reprogramar fecha"
                              >
                                ✏️ Cambiar
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-6 font-extrabold text-slate-900">
                            $ {Number(p.monto).toLocaleString('es-MX')} MXN
                            {p.monto_real !== p.monto && estatus === 'Pagado' && (
                              <div className="text-[10px] text-emerald-600 font-normal">Real cobrado: ${p.monto_real}</div>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              estatus === 'Pagado' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : estatus === 'Cancelado'
                                  ? 'bg-slate-200 text-slate-600'
                                  : estaVencido 
                                    ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                                    : 'bg-amber-50 text-amber-600'
                            }`}>
                              {estatus === 'Cancelado' ? '🚫 Cancelado (Baja)' : estaVencido ? '⚠️ Vencido' : estatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            {estatus === 'Pagado' ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl">✓ Pagado</span>
                            ) : estatus === 'Cancelado' ? (
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">Sin acción (Baja)</span>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                {estaVencido && (
                                  <button 
                                    onClick={() => enviarRecordatorioWhatsApp(p)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-semibold transition shadow-sm flex items-center gap-1"
                                    title="Enviar recordatorio de pago por WhatsApp"
                                  >
                                    💬 Recordar WA
                                  </button>
                                )}
                                <button 
                                  onClick={() => abrirModalPago(p)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-semibold transition shadow-sm"
                                >
                                  Registrar pago
                                </button>
                              </div>
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

      {/* MODAL REGISTRAR PAGO AVANZADO (BECAS / ADELANTOS) */}
      {modalPago && pagoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Registrar Pago</h3>
              <p className="text-xs text-slate-400 mt-0.5">Estudiante: <strong className="text-slate-700">{pagoSeleccionado.alumnoNombre}</strong></p>
              <p className="text-xs text-slate-500 mt-1">Cuota oficial programada: <strong className="text-indigo-600">${pagoSeleccionado.monto}</strong></p>
            </div>

            <form onSubmit={procesarPagoAvanzado} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Tipo de Movimiento</label>
                <select 
                  value={tipoMovimiento} 
                  onChange={(e) => {
                    setTipoMovimiento(e.target.value)
                    if(e.target.value === 'beca') setMontoPagadoReal(0)
                    else setMontoPagadoReal(pagoSeleccionado.monto)
                  }}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                >
                  <option value="normal">Pago Normal / Adelanto</option>
                  <option value="beca">Beca / Cortesía (100% Descuento)</option>
                  <option value="descuento">Pago Parcial / Con Descuento Específico</option>
                </select>
              </div>

              {tipoMovimiento !== 'beca' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Monto Real Pagado por el Alumno ($)</label>
                  <input 
                    type="number" 
                    required
                    value={montoPagadoReal}
                    onChange={(e) => setMontoPagadoReal(e.target.value)}
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600 font-bold text-slate-800"
                    placeholder="Ej. 200 o 300 si pagó adelantado"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Si ingresas una cantidad mayor a la cuota, el sobrante se abonará automáticamente al siguiente pago del alumno.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalPago(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardandoPago} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50">
                  {guardandoPago ? 'Procesando...' : 'Confirmar y Notificar WA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR FECHA */}
      {modalFecha && pagoSeleccionado && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Reprogramar Fecha de Vencimiento</h3>
              <p className="text-xs text-slate-400 mt-0.5">Estudiante: <strong className="text-slate-700">{pagoSeleccionado.alumnoNombre}</strong></p>
            </div>

            <form onSubmit={guardarNuevaFecha} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nueva Fecha de Vencimiento</label>
                <input 
                  type="date" 
                  required
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                  className="w-full p-3.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox" 
                  id="desplazar" 
                  checked={desplazarResto}
                  onChange={(e) => setDesplazarResto(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <label htmlFor="desplazar" className="text-xs text-slate-700 select-none cursor-pointer">
                  Desplazar en cadena los pagos pendientes siguientes (manteniendo el intervalo de días)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setModalFecha(false)} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancelar</button>
                <button type="submit" disabled={guardandoFecha} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold transition shadow-sm disabled:opacity-50">
                  {guardandoFecha ? 'Guardando...' : 'Aplicar Reprogramación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
