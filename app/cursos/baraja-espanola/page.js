'use client'

import { useState, useEffect } from 'react'

export default function LandingBarajaEspanola() {
  // Temporizador de cuenta regresiva (15 minutos)
  const [timeLeft, setTimeLeft] = useState(15 * 60)
  const [loadingCheckout, setLoadingCheckout] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Función para disparar tu pasarela de Stripe que ya probamos
  const handleCheckout = async () => {
    try {
      setLoadingCheckout(true)
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curso_id: '1', grupo_id: '5' })
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error al iniciar el pago: ' + (data.error || 'Intenta de nuevo'))
        setLoadingCheckout(false)
      }
    } catch (err) {
      console.error(err)
      alert('Ocurrió un error de conexión.')
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-900 selection:text-white">
      
      {/* 1. BARRA SUPERIOR DE URGENCIA (STICKY HEADER) */}
      <div className="bg-rose-950 border-b border-rose-900/50 py-2.5 px-4 sticky top-0 z-50 text-center shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 text-xs sm:text-sm font-medium">
          <span className="text-rose-200">⚡ OFERTA ESPECIAL POR TIEMPO LIMITADO: De <span className="line-through text-rose-400">$4,950 MXN</span> a solo <strong className="text-white font-black">$499 MXN</strong></span>
          <span className="bg-rose-900/80 text-white font-mono px-2.5 py-0.5 rounded-full text-xs font-bold border border-rose-700/50 shadow-inner">
            ⏰ Expira en: {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* 2. SECCIÓN HERO (IMPACTO INICIAL) */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 max-w-5xl mx-auto text-center space-y-8">
        {/* Resplandor místico rojo de fondo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-rose-600/10 blur-[120px] rounded-full pointer-events-none -z-10"></div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-rose-400 text-xs font-semibold tracking-wide shadow-xs">
          <span>🔮</span> Comunidad Espiritistas a Cantar • Más de 10,000 estudiantes en Latinoamérica
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]">
          Despierta tu intuición y domina la lectura de la <span className="text-rose-600 underline decoration-rose-900/60 underline-offset-8">Baraja Española</span> desde cero
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          Aprende el arte de consultar a otros, la auto-consulta, las tiradas de Sí o No, y la consagración sagrada de tus cartas guiado por una metodología probada.
        </p>

        <div className="pt-2">
          <button 
            onClick={handleCheckout}
            disabled={loadingCheckout}
            className="w-full sm:w-auto bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-base sm:text-lg px-8 py-4 rounded-2xl shadow-xl shadow-rose-950/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
          >
            {loadingCheckout ? 'Redirigiendo a pasarela...' : '👉 Quiero mi acceso inmediato por $499 MXN'}
          </button>
          <p className="text-[11px] text-slate-400 mt-2 font-medium">✨ Acceso instantáneo y de por vida a la plataforma</p>
        </div>
      </section>

      {/* 3. HISTORIA Y CONEXIÓN (AUTORIDAD CON ALMA) */}
      <section className="py-16 px-6 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-3xl mx-auto space-y-6">
          <h3 className="text-xs uppercase font-bold tracking-widest text-rose-500 text-center">Linaje y Propósito</h3>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white text-center">¿Por qué este taller es diferente?</h2>
          
          <div className="relative p-8 rounded-3xl bg-slate-950 border border-slate-800/80 shadow-xl space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
            <div className="absolute top-4 right-6 text-4xl text-rose-900/40 font-serif">“</div>
            <p>
              Soy Migue. Me inicié en el mundo de la espiritualidad y el espiritismo a los 16 años... Este trayecto ha sido maravilloso, me ha enseñado muchísimo y me ha dado todo en la vida; no soy nada sin lo que me acompaña y administra.
            </p>
            <p>
              Este taller en particular lleva tonalidades rojas porque está dedicado con profundo respeto y cariño al espíritu de <strong className="text-rose-400 font-semibold">la gitana que me acompaña y guía</strong> en este camino (y que, entre nos, me ayudó a armarlo todo). 
            </p>
            <p>
              Hoy, a través de <strong className="text-white font-semibold">Espiritistas a Cantar</strong> y con una comunidad de más de 10,000 estudiantes en Latinoamérica, comparto este conocimiento contigo de forma clara, directa y sin rodeos.
            </p>
          </div>
        </div>
      </section>

      {/* 4. ¿QUÉ VAS A DOMINAR EN ESTE TALLER? (BENEFICIOS Y MÓDULOS) */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h3 className="text-xs uppercase font-bold tracking-widest text-rose-500">Plan de Estudios</h3>
          <h2 className="text-2xl sm:text-4xl font-black text-white">¿Qué vas a dominar en este taller?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-rose-900/50 transition space-y-3">
            <div className="text-2xl">🃏</div>
            <h4 className="text-base font-bold text-white">Significado profundo de los mazos y cada carta</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Olvídate de memorizar como robot; comprende la energía viva y el trasfondo de cada arcano.</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-rose-900/50 transition space-y-3">
            <div className="text-2xl">🔮</div>
            <h4 className="text-base font-bold text-white">Auto-consultas y lecturas para otros</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Aprende a conectar primero con tu propia energía y a brindar respuestas claras y certeras a quienes te consulten.</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-rose-900/50 transition space-y-3">
            <div className="text-2xl">⚖️</div>
            <h4 className="text-base font-bold text-white">Preguntas de Sí o No</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Técnicas de precisión milimétrica para obtener respuestas rápidas, directas y sin ambigüedades en momentos clave.</p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-rose-900/50 transition space-y-3">
            <div className="text-2xl">🕯️</div>
            <h4 className="text-base font-bold text-white">Consagración sagrada del mazo</h4>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Los secretos indispensables para despertar, limpiar y sintonizar la energía de tus cartas antes de usarlas por primera vez.</p>
          </div>

        </div>
      </section>

      {/* 5. ¿QUÉ INCLUYE TU ACCESO HOY? (EL STACK DE VALOR) */}
      <section className="py-16 px-6 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xs uppercase font-bold tracking-widest text-rose-500">Inversión Inteligente</h3>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">¿Qué incluye tu acceso hoy?</h2>
          </div>

          <div className="bg-slate-950 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-start gap-4">
              <span className="text-rose-500 text-lg font-bold">✔️</span>
              <p className="text-xs sm:text-sm text-slate-200"><strong>3 Clases en video grabadas</strong> (2 horas de contenido potente por cada clase). Veremos el significado de las cartas, las diferentes formas de consultar, cómo consagrar tu mazo y <span className="text-rose-400 font-semibold">un secreto que te compartiré para despertar tu intuición</span> y conexión profunda con tus cartas.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-rose-500 text-lg font-bold">✔️</span>
              <p className="text-xs sm:text-sm text-slate-200"><strong>Manual digital descargable</strong> con los significados clave y esquemas de tiradas.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-rose-500 text-lg font-bold">✔️</span>
              <p className="text-xs sm:text-sm text-slate-200"><strong>Acceso ilimitado y de por vida</strong> a la plataforma para repasar las clases cuantas veces lo necesites.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-rose-500 text-lg font-bold">✔️</span>
              <p className="text-xs sm:text-sm text-slate-200"><strong>Soporte directo por WhatsApp</strong> para resolver tus dudas durante tu aprendizaje.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. EL CIERRE DE IMPACTO (PRECIO, ESCASEZ Y CTA) */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center space-y-8">
        <div className="bg-gradient-to-b from-rose-950/40 to-slate-950 p-10 rounded-[2.5rem] border border-rose-900/40 shadow-2xl space-y-6">
          
          <span className="bg-rose-900/50 text-rose-200 border border-rose-700/40 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full inline-block">
            Acceso Inmediato
          </span>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Valor regular cuando se impartió en vivo:</p>
            <p className="text-xl font-bold text-slate-500 line-through">$4,950 MXN</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-rose-400 uppercase font-bold tracking-wider">Precio especial de hoy:</p>
            <div className="text-5xl sm:text-6xl font-black text-white tracking-tight">
              $499 <span className="text-xl font-normal text-slate-400">MXN</span>
            </div>
          </div>

          <div className="pt-4 max-w-md mx-auto">
            <button 
              onClick={handleCheckout}
              disabled={loadingCheckout}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-black text-base sm:text-lg px-8 py-4 rounded-2xl shadow-xl shadow-rose-950/80 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 cursor-pointer"
            >
              {loadingCheckout ? 'Conectando...' : '🔥 ¡Quiero Inscribirme Ahora por $499!'}
            </button>
            <p className="text-[11px] text-slate-400 mt-3">🔒 Pago 100% seguro procesado por Stripe. Acceso automático inmediato.</p>
          </div>

          <div className="border-t border-slate-800/80 pt-6 mt-6 max-w-lg mx-auto">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong>Garantía de claridad:</strong> Cero rodeos, explicaciones directas y 100% aplicable desde el primer minuto. Empieza a leer tu mazo hoy mismo.
            </p>
          </div>

        </div>

        <footer className="text-xs text-slate-600 pt-8 border-t border-slate-900">
          © {new Date().getFullYear()} Espiritistas a Cantar. Todos los derechos reservados.
        </footer>
      </section>

    </div>
  )
}
