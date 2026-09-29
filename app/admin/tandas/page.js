'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export default function AdminTandasPage() {
    const [alumnoId, setAlumnoId] = useState('')
    const [fechaMisa, setFechaMisa] = useState('')
    const [inscritos, setInscritos] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargarListaInscritos()
    }, [])

    async function cargarListaInscritos() {
        setCargando(true)
        const { data, error } = await supabase
            .from('alumno_tandas')
            .select(`
                id,
                alumno_id,
                fecha_misa,
                tanda_pagos (id, numero_pago, estado)
            `)
            .eq('estado', 'activa')

        if (error) {
            console.error("Error al cargar:", error)
        } else {
            setInscritos(data || [])
        }
        setCargando(false)
    }

    async function inscribirAlumnoTanda(e) {
        e.preventDefault()
        if (!alumnoId || !fechaMisa) {
            alert("Por favor ingresa el ID del alumno y la fecha de la misa.")
            return
        }

        const { error } = await supabase
            .from('alumno_tandas')
            .insert([{ alumno_id: alumnoId.trim(), tanda_id: 1, fecha_misa: fechaMisa, estado: 'activa' }])

        if (error) {
            alert("Error al inscribir: " + error.message)
        } else {
            alert("¡Alumno inscrito correctamente a la tanda!")
            setAlumnoId('')
            setFechaMisa('')
            cargarListaInscritos()
        }
    }

    async function registrarPago(alumnoTandaId, numeroPago) {
        const { error } = await supabase
            .from('tanda_pagos')
            .insert([{
                alumno_tanda_id: alumnoTandaId,
                numero_pago: numeroPago,
                monto: 500.00,
                estado: 'pagado',
                fecha_pago: new Date()
            }]);

        if (error) {
            alert("Error al registrar pago: " + error.message)
        } else {
            alert(`¡Pago #${numeroPago} registrado con éxito!`)
            cargarListaInscritos()
        }
    }

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
                    <a href="/admin/pagos" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
                    
                    <div className="pt-4 px-3 pb-2 text-[10px] uppercase tracking-wider text-indigo-400 font-bold">Presencial</div>
                    <a href="/admin/tandas" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">📍 Tandas y Misas</a>
                </nav>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-1 flex flex-col h-full overflow-y-auto">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-30 shadow-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">Gestión de Tandas y Misas de Investigación</span>
                    </div>
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl">Academia Espiritistas a Cantar</span>
                </header>

                <div className="p-8 max-w-[1600px] mx-auto w-full space-y-8">
                    
                    {/* FORMULARIO DE INSCRIPCIÓN */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900">Inscribir Alumno a Tanda</h3>
                        <form onSubmit={inscribirAlumnoTanda} className="flex flex-col sm:flex-row gap-4">
                            <input 
                                type="text" 
                                placeholder="UUID o ID del Alumno" 
                                value={alumnoId}
                                onChange={(e) => setAlumnoId(e.target.value)}
                                className="flex-1 p-3.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none focus:border-indigo-600 font-mono"
                            />
                            <input 
                                type="datetime-local" 
                                value={fechaMisa}
                                onChange={(e) => setFechaMisa(e.target.value)}
                                className="p-3.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none focus:border-indigo-600"
                            />
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl text-xs font-semibold shadow-md transition">
                                Inscribir a Tanda
                            </button>
                        </form>
                    </div>

                    {/* TABLA DE CONTROL */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-slate-900">Control de Pagos y Avance</h3>
                            <button onClick={cargarListaInscritos} className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-xl hover:bg-indigo-100 transition">
                                Actualizar Lista
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                                        <th className="pb-3 px-4">Alumno ID</th>
                                        <th className="pb-3 px-4">Fecha de Misa</th>
                                        <th className="pb-3 px-4">Pagos Realizados</th>
                                        <th className="pb-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-xs">
                                    {cargando ? (
                                        <tr><td colSpan="4" className="py-8 text-center text-slate-400">Cargando inscritos...</td></tr>
                                    ) : inscritos.length === 0 ? (
                                        <tr><td colSpan="4" className="py-8 text-center text-slate-400">No hay alumnos inscritos en tandas actualmente.</td></tr>
                                    ) : (
                                        inscritos.map((item) => {
                                            const pagosHechos = item.tanda_pagos ? item.tanda_pagos.filter(p => p.estado === 'pagado').length : 0
                                            const proximoPagoNum = pagosHechos + 1
                                            const fechaFormateada = item.fecha_misa ? new Date(item.fecha_misa).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                                    <td className="py-4 px-4 font-mono font-medium text-slate-700">{item.alumno_id}</td>
                                                    <td className="py-4 px-4 text-slate-600">{fechaFormateada}</td>
                                                    <td className="py-4 px-4 font-bold" style={{ color: pagosHechos === 10 ? '#10b981' : '#0f172a' }}>
                                                        {pagosHechos} / 10
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        {pagosHechos < 10 ? (
                                                            <button 
                                                                onClick={() => registrarPago(item.id, proximoPagoNum)}
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition"
                                                            >
                                                                Registrar Pago #{proximoPagoNum}
                                                            </button>
                                                        ) : (
                                                            <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-xl">¡Completado!</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    )
}
