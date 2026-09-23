'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const manejarIngreso = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const userTrim = usuario.trim()
    const passTrim = password.trim()

    // 1. Validar Credenciales de Administrador
    if (userTrim === 'admin' && passTrim === 'EAC2026_Secure*') {
      localStorage.setItem('eac_sesion', JSON.stringify({ rol: 'admin' }))
      window.location.href = '/admin'
      return
    }

    // 2. Validar Credenciales de Estudiante en Supabase
    const { data, error } = await supabase
      .from('alumnos')
      .select('*')
      .or(`telefono.eq.${userTrim},correo.eq.${userTrim}`)
      .eq('password', passTrim)
      .single()

    if (error || !data) {
      setErrorMsg('Credenciales incorrectas. Verifique sus datos o contacte a administración.')
      setLoading(false)
      return
    }

    // Guardar sesión de alumno y redirigir
    localStorage.setItem('eac_sesion', JSON.stringify({ rol: 'alumno', alumno: data }))
    window.location.href = '/alumno'
  }

  return (
    <main className="min-h-screen flex flex-col justify-between bg-[#0a0f1d] text-slate-100 p-6 md:p-12 relative overflow-hidden">
      
      {/* Efectos visuales de fondo sutiles e institucionales */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-15 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-indigo-600 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600 blur-[130px] rounded-full"></div>
      </div>

      {/* Header Institucional */}
      <header className="flex justify-between items-center max-w-7xl mx-auto w-full z-10 relative">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-tight">Espiritistas a Cantar</h2>
            <span className="text-[11px] text-slate-400 font-medium">Sistema Académico & LMS</span>
          </div>
        </div>
        <div className="hidden md:flex gap-6 text-xs text-slate-400 font-medium">
          <span>Soporte Académico: 56 3208 7410</span>
        </div>
      </header>

      {/* Formulario de Acceso */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-8 z-10 relative">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">Portal Institucional</h1>
          <p className="text-slate-400 text-sm">Ingrese sus credenciales para acceder al sistema.</p>
        </div>
        
        <div className="bg-white text-slate-900 rounded-3xl w-full p-8 shadow-2xl border border-slate-200/80">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={manejarIngreso} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Usuario / Teléfono</label>
              <input 
                type="text" 
                required 
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ingrese su usuario" 
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-slate-50 transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-slate-50 transition"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl font-semibold transition shadow-sm text-sm mt-2 disabled:opacity-50"
            >
              {loading ? 'Verificando credenciales...' : 'Acceder al Sistema'}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full text-center text-xs text-slate-500 z-10">
        <p>© 2026 Espiritistas a Cantar. Excelencia y Disciplina Académica.</p>
      </footer>
    </main>
  )
}
