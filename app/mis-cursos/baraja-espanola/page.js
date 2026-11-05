'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase' // Ajusta tu ruta de importación si es necesario

export default function ReproductorBarajaPage() {
  const [curso, setCurso] = useState(null)
  const [lecciones, setLecciones] = useState([])
  const [claseActiva, setClaseActiva] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatosDelCursoYLecciones()
  }, [])

  const cargarDatosDelCursoYLecciones = async () => {
    setLoading(true)
    
    // 1. Consultamos la información general del curso para obtener el enlace del PDF (ej. curso ID 16)
    const { data: resCurso } = await supabase
      .from('cursos')
      .select('*')
      .eq('id', 16)
      .single()

    // 2. Consultamos las lecciones de la base de datos ordenadas por su campo 'orden'
    const { data: resLecciones, error } = await supabase
      .from('lecciones_lms')
      .select('*')
      .eq('curso_id', 16)
      .order('orden', { ascending: true })

    if (resCurso) setCurso(resCurso)

    if (error) {
      console.error('Error al cargar clases:', error.message)
    } else if (resLecciones && resLecciones.length > 0) {
      setLecciones(resLecciones)
      setClaseActiva(resLecciones[0]) // Selecciona automáticamente la primera clase
    }
    setLoading(false)
  }

  // Función inteligente para transformar cualquier link de YouTube a formato embed
  const obtenerUrlEmbed = (url) => {
    if (!url) return ''
    if (url.includes('youtu.be/')) {
      const idVideo = url.split('/').pop()
      return `https://www.youtube.com/embed/${idVideo}`
    }
    if (url.includes('watch?v=')) {
      return url.replace('watch?v=', 'embed/')
    }
    return url
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-500">
        <p className="text-xs uppercase tracking-widest font-bold animate-pulse">Cargando contenido del taller...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* NAVBAR SUPERIOR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/mis-cursos" className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
            <span>←</span> Volver a Mis Cursos
          </a>
          <span className="text-xs font-extrabold text-slate-900 hidden sm:inline">
            {curso?.Nombre_curso || curso?.nombre_curso || 'Taller de Baraja Española'}
          </span>
          <a 
            href="https://wa.me/5215500000000" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs bg-emerald-50 text-emerald-700 font-bold px-3.5 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition"
          >
            💬 Soporte por WhatsApp
          </a>
        </div>
      </header>

      {/* CONTENIDO DEL REPRODUCTOR */}
      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: REPRODUCTOR Y DETALLES */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Contenedor del Video Dinámico */}
          <div className="bg-black rounded-3xl overflow-hidden shadow-lg aspect-video flex items-center justify-center relative">
            {claseActiva ? (
              <iframe 
                src={obtenerUrlEmbed(claseActiva.video_url)} 
                title={claseActiva.titulo}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              ></iframe>
            ) : (
              <p className="text-white text-xs">No hay clases disponibles en este momento.</p>
            )}
          </div>

          {/* Información de la clase actual */}
          {claseActiva && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 px-3 py-1 rounded-full">
                  Clase Activa
                </span>
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {claseActiva.titulo}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Disfruta de este contenido exclusivo preparado para tu formación y desarrollo en el taller.
              </p>
            </div>
          )}

          {/* SECCIÓN DE RECURSOS DESCARGABLES (CONECTADO AL ENLACE DEL ADMIN) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Materiales Descargables</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Manual Digital del Curso</p>
                  <p className="text-[11px] text-slate-500">PDF con significados clave y esquemas de tiradas.</p>
                </div>
              </div>
              
              {curso?.manual_pdf_url ? (
                <a 
                  href={curso.manual_pdf_url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition whitespace-nowrap"
                >
                  Descargar PDF ⬇️
                </a>
              ) : (
                <span className="text-xs text-slate-400 italic">Próximamente disponible</span>
              )}
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: TEMARIO DINÁMICO DESDE EL ADMIN */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 sticky top-24">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contenido del Taller</h3>

            {lecciones.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Próximamente se habilitarán las clases.</p>
            ) : (
              <div className="space-y-2">
                {lecciones.map((clase, index) => {
                  const esActiva = claseActiva?.id === clase.id
                  return (
                    <button
                      key={clase.id}
                      onClick={() => setClaseActiva(clase)}
                      className={`w-full text-left p-4 rounded-2xl transition flex items-center justify-between border cursor-pointer ${
                        esActiva 
                          ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' 
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-wider text-rose-600 font-bold">Clase {clase.orden || index + 1}</p>
                        <p className="text-xs line-clamp-1">{clase.titulo}</p>
                      </div>
                      <span className="text-sm">{esActiva ? '▶️' : '📖'}</span>
                    </button>
                  )
                })}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
                <p className="text-xs font-bold text-slate-800">¿Dudas con el contenido?</p>
                <p className="text-[11px] text-slate-500">Escríbenos directamente y te apoyamos con tu proceso.</p>
                <a 
                  href="https://wa.me/5215500000000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition"
                >
                  Abrir Soporte WhatsApp
                </a>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
