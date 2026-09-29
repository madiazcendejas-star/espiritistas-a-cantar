'use client';
import { useState, useEffect } from 'react';
// Ajusta la ruta de importación de tu cliente de supabase según lo tengas en tu proyecto (ej: '@/lib/supabase' o similar)
import { createClient } from '@supabase/supabase-js'; 
// O si ya tienes una instancia global importada, úsala directamente.

export default function AdminTandasPage() {
    const [alumnoId, setAlumnoId] = useState('');
    const [fechaMisa, setFechaMisa] = useState('');
    const [inscritos, setInscritos] = useState([]);
    const [cargando, setCargando] = useState(true);

    // Inicializa tu cliente de Supabase (o impórtalo de tu archivo de configuración)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cargar lista de inscritos al montar la página
    useEffect(() => {
        cargarListaInscritos();
    }, []);

    async function cargarListaInscritos() {
        setCargando(true);
        const { data, error } = await supabase
            .from('alumno_tandas')
            .select(`
                id,
                alumno_id,
                fecha_misa,
                tanda_pagos (id, numero_pago, estado)
            `)
            .eq('estado', 'activa');

        if (error) {
            console.error("Error al cargar:", error);
        } else {
            setInscritos(data || []);
        }
        setCargando(false);
    }

    async function inscribirAlumnoTanda(e) {
        e.preventDefault();
        if (!alumnoId || !fechaMisa) {
            alert("Por favor ingresa el ID del alumno y la fecha de la misa.");
            return;
        }

        const { error } = await supabase
            .from('alumno_tandas')
            .insert([{ alumno_id: alumnoId.trim(), tanda_id: 1, fecha_misa: fechaMisa, estado: 'activa' }]);

        if (error) {
            alert("Error al inscribir: " + error.message);
        } else {
            alert("¡Alumno inscrito correctamente a la tanda!");
            setAlumnoId('');
            setFechaMisa('');
            cargarListaInscritos();
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
            alert("Error al registrar pago: " + error.message);
        } else {
            alert(`¡Pago #${numeroPago} registrado con éxito!`);
            cargarListaInscritos();
        }
    }

    return (
        <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
                ⚙️ Gestión de Tandas y Misas de Investigación
            </h1>

            {/* Formulario de Inscripción */}
            <form onSubmit={inscribirAlumnoTanda} style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>Inscribir Alumno a Tanda</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        placeholder="UUID o ID del Alumno" 
                        value={alumnoId}
                        onChange={(e) => setAlumnoId(e.target.value)}
                        style={{ padding: '8px 12px', flex: '1', minWidth: '250px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <input 
                        type="datetime-local" 
                        value={fechaMisa}
                        onChange={(e) => setFechaMisa(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    />
                    <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}>
                        Inscribir a Tanda
                    </button>
                </div>
            </form>

            {/* Tabla de Control */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3 style={{ fontSize: '18px' }}>Control de Pagos y Avance</h3>
                    <button onClick={cargarListaInscritos} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        Actualizar Lista
                    </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '6px', overflow: 'hidden' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Alumno ID</th>
                            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Fecha de Misa</th>
                            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Pagos Realizados</th>
                            <th style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Cargando inscritos...</td></tr>
                        ) : inscritos.length === 0 ? (
                            <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No hay alumnos inscritos en tandas actualmente.</td></tr>
                        ) : (
                            inscritos.map((item) => {
                                const pagosHechos = item.tanda_pagos ? item.tanda_pagos.filter(p => p.estado === 'pagado').length : 0;
                                const proximoPagoNum = pagosHechos + 1;
                                const fechaFormateada = item.fecha_misa ? new Date(item.fecha_misa).toLocaleString('es-MX') : 'Sin fecha';

                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                        <td style={{ padding: '12px', fontSize: '13px', color: '#334155' }}>{item.alumno_id}</td>
                                        <td style={{ padding: '12px', color: '#334155' }}>{fechaFormateada}</td>
                                        <td style={{ padding: '12px', fontWeight: 'bold', color: pagosHechos === 10 ? '#16a34a' : '#0f172a' }}>
                                            {pagosHechos} / 10
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {pagosHechos < 10 ? (
                                                <button 
                                                    onClick={() => registrarPago(item.id, proximoPagoNum)}
                                                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                                                >
                                                    Registrar Pago #{proximoPagoNum}
                                                </button>
                                            ) : (
                                                <span style={{ color: '#16a34a', fontWeight: '500' }}>¡Completado!</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
