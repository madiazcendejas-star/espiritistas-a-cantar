'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function MisCursosDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function getUserSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      }
      setLoading(false)
    }
    getUserSession()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/cursos/baraja-espanola'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-500 flex items-center justify-center font-sans">
        <p className="text-xs tracking-widest uppercase animate-pulse font-semibold">Cargando tu portal...</p>
      </div>
    )
  }

  // Nombre de usuario limpio sacado del correo o sesión
  const nombreUsuario = user?.email ? user.email.split('@')[0].toUpperCase() : 'ESTUDIANTE'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-rose-500 selection:text-white">
      
      {/* NAVBAR SUPERIOR CLARO Y MINIMALISTA */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
              E
            </div>
            <span className="font-extrabold tracking-tight text-slate-900 text-sm">Espiritistas a Cantar</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden sm:flex items-center gap-6 text-xs font-bold text-slate-600">
              <a href="/mis-cursos" className="text-rose-600 border-b-2 border-rose-600 pb-1">Mis cursos</a>
              <a href="#soporte" className="hover:text-slate-900 transition">Soporte WA</a>
            </nav>

            {/* Menú de usuario */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
              <div className="text-right hidden md:block">
                <p className="text-xs font-bold text-slate-800">{nombreUsuario}</p>
                <p className="text-[10px] text-slate-400">{user?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl transition font-semibold cursor-pointer"
                title="Cerrar sesión"
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL DEL PORTAL */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        
        {/* SALUDO AL ESTUDIANTE */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Hola, {nombreUsuario}!
          </h1>
          <p className="text-sm text-slate-500 font-medium">Bienvenido de nuevo a tu espacio de aprendizaje.</p>
        </div>

        {/* SECCIÓN: CONTINUAR APRENDIENDO */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Continuando aprendiendo</h2>
          
          {/* TARJETA DESTACADA DEL CURSO */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition space-y-6">
            
            {/* Barra de progreso general */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-rose-600">0% completado</span>
                <span className="text-slate-400">0 / 3 clases</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-600 h-full w-[0%] rounded-full"></div>
              </div>
            </div>

            {/* Info del curso y botón */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
              <div className="space-y-2 max-w-xl">
                <span className="inline-block px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] uppercase tracking-wider">
                  Acceso Activo • Vitalicio
                </span>
                <h3 className="text-2xl font-black text-slate-900">Taller de Baraja Española</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Domina la lectura del mazo desde cero, auto-consultas, tiradas de Sí o No y los secretos de consagración sagrada.
                </p>
              </div>

              <a 
                href="/mis-cursos/baraja-espanola"
                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm px-6 py-4 rounded-2xl shadow-md shadow-rose-600/20 transition text-center whitespace-nowrap cursor-pointer"
              >
                Seguir aprendiendo 🚀
              </a>
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
