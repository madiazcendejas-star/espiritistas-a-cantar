'use client'

import { useState } from 'react'

export default function ReproductorBarajaPage() {
  // Estado para cambiar de clase activa
  const [claseActiva, setClaseActiva] = useState(1)

  // Información de las 3 clases y el contenido del curso
  const clasesData = {
    1: {
      titulo: "Clase 1: El significado de los mazos y cada carta",
      duracion: "2 horas",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Aquí irá tu enlace de video real (YouTube, Vimeo, etc.)
      descripcion: "Comprende la energía viva y el trasfondo de cada arcano de la baraja española sin necesidad de memorizar como robot."
    },
    2: {
      titulo: "Clase 2: Auto-consultas, tiradas y preguntas de Sí o No",
      duracion: "2 horas",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      descripcion: "Aprende a conectar primero con tu propia energía y domina las técnicas de precisión milimétrica para preguntas directas."
    },
    3: {
      titulo: "Clase 3: Consagración del mazo y secreto de intuición",
      duracion: "2 horas",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      descripcion: "Los secretos indispensables para despertar, limpiar y sintonizar la energía de tus cartas, junto al secreto para potenciar tu intuición."
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* NAVBAR SUPERIOR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="/mis-cursos" className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
            <span>←</span> Volver a Mis Cursos
          </a>
          <span className="text-xs font-extrabold text-slate-900 hidden sm:inline">Taller de Baraja Española</span>
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
        
        {/* COLUMNA IZQUIERDA: REPRODUCTOR Y DETALLES (2 columnas de ancho) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Contenedor del Video */}
          <div className="bg-black rounded-3xl overflow-hidden shadow-lg aspect-video flex items-center justify-center relative">
            <iframe 
              src={clasesData[claseActiva].videoUrl} 
              title={clasesData[claseActiva].titulo}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>

          {/* Información de la clase actual */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 px-3 py-1 rounded-full">
                Clase {claseActiva} de 3
              </span>
              <span className="text-xs text-slate-400 font-medium">⏱️ {clasesData[claseActiva].duracion}</span>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              {clasesData[claseActiva].titulo}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {clasesData[claseActiva].descripcion}
            </p>
          </div>

          {/* SECCIÓN DE RECURSOS DESCARGABLES */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Materiales Descargables</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <p className="text-xs font-bold text-slate-900">Manual Digital de la Baraja Española</p>
                  <p className="text-[11px] text-slate-500">PDF con significados clave y esquemas de tiradas.</p>
                </div>
              </div>
              <a 
                href="/recursos/manual-baraja.pdf" 
                target="_blank"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition whitespace-nowrap"
              >
                Descargar PDF ⬇️
              </a>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA: TEMARIO / LISTA DE CLASES (1 columna de ancho) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 sticky top-24">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Contenido del Taller</h3>

            <div className="space-y-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => setClaseActiva(num)}
                  className={`w-full text-left p-4 rounded-2xl transition flex items-center justify-between border cursor-pointer ${
                    claseActiva === num 
                      ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-rose-600 font-bold">Clase {num}</p>
                    <p className="text-xs line-clamp-1">{clasesData[num].titulo.split(':')[1]}</p>
                  </div>
                  <span className="text-sm">{claseActiva === num ? '▶️' : '🔒'}</span>
                </button>
              ))}
            </div>

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
