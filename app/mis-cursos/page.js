'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function MisCursosPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si el usuario está autenticado en Supabase
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/cursos/baraja-espanola'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080203] text-slate-300 flex items-center justify-center font-sans">
        <p className="text-sm tracking-widest uppercase animate-pulse">Cargando tus clases...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080203] text-slate-100 font-sans">
      
      {/* HEADER DEL PANEL */}
      <header className="border-b border-red-950/60 bg-[#0f0305]/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌹</span>
            <span className="font-black tracking-wider text-white uppercase text-sm">Espiritistas a Cantar</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline">{user?.email || 'Estudiante'}</span>
            <button 
              onClick={handleLogout}
              className="text-xs bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/50 px-3.5 py-2 rounded-xl transition font-medium cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-10">
        
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white">Tus Cursos Adquiridos</h1>
          <p className="text-xs sm:text-sm text-slate-400">Accede a tus clases grabadas, manuales y contenido exclusivo.</p>
        </div>

        {/* LISTA DE CURSOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#0f0305] border border-red-900/40 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-full bg-red-950/80 border border-red-800/50 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                Acceso Activo • De por vida
              </div>
              <h3 className="text-xl font-bold text-white">Taller de Baraja Española</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Domina la lectura del mazo desde cero, auto-consultas, tiradas de Sí/No y el proceso sagrado de consagración.
              </p>
            </div>

            <div className="pt-4 border-t border-red-950 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">3 Clases grabadas • Manual PDF</span>
              <a 
                href="/mis-cursos/baraja-espanola"
                className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg shadow-red-950/80 transition"
              >
                Ver Clases 📺
              </a>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
