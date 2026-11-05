'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrorMsg('')

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirigir al portal unificado de cursos
      window.location.href = '/mis-cursos'

    } catch (err) {
      setErrorMsg(err.message || 'Correo o contraseña incorrectos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-3xl shadow-sm space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto text-lg font-black shadow-sm">
            E
          </div>
          <h1 className="text-xl font-black text-slate-900">Iniciar Sesión</h1>
          <p className="text-xs text-slate-500">Ingresa a tu portal de alumno para ver tus clases y materiales.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 outline-none focus:border-rose-600 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Contraseña</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 outline-none focus:border-rose-600 transition"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition cursor-pointer"
          >
            {loading ? 'Verificando acceso...' : 'Entrar a mi portal 🚀'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            ¿Tienes problemas para entrar? Contáctanos por WhatsApp para apoyarte.
          </p>
        </div>

      </div>
    </div>
  )
}
