'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

function GraciasContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [emailCliente, setEmailCliente] = useState('')
  const [password, setPassword] = useState('')
  const [cuentaCreada, setCuentaCreada] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (sessionId) {
      setTimeout(() => {
        setEmailCliente('cliente_ejemplo@gmail.com') 
        setLoading(false)
      }, 1000)
    } else {
      setLoading(false)
    }
  }, [sessionId])

  const handleCrearPassword = async (e) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      return setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
    }

    try {
      setLoading(true)
      setErrorMsg('')

      const { data, error } = await supabase.auth.signUp({
        email: emailCliente,
        password: password,
      })

      if (error) throw error

      setCuentaCreada(true)
      setLoading(false)

      setTimeout(() => {
        window.location.href = '/mis-cursos'
      }, 2000)

    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-[#0f0305] border border-red-900/50 p-8 rounded-[2.5rem] shadow-2xl text-center space-y-6">
      
      <div className="w-16 h-16 bg-red-950 text-red-50 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black shadow-inner border border-red-800/40">
        ✓
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-white">¡Pago completado con éxito!</h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Tu compra se ha procesado correctamente. Para acceder de inmediato a tus clases y materiales, define tu contraseña de acceso.
        </p>
      </div>

      {!cuentaCreada ? (
        <form onSubmit={handleCrearPassword} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-bold uppercase text-red-400 mb-1">Tu Usuario (Correo Electrónico)</label>
            <input 
              type="email" 
              disabled 
              value={emailCliente} 
              className="w-full p-3 border border-red-950 rounded-xl text-xs bg-[#080203] text-slate-400 outline-none cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-red-400 mb-1">Crea tu Contraseña *</label>
            <input 
              type="password" 
              required
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-red-900/60 rounded-xl text-xs bg-[#080203] text-white outline-none focus:border-red-600 transition"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 bg-red-950/50 p-2.5 rounded-xl border border-red-900/50 text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-800 text-white font-black text-sm py-3.5 rounded-xl shadow-lg shadow-red-950/80 transition cursor-pointer"
          >
            {loading ? 'Guardando acceso...' : '🚀 Activar mi cuenta y entrar'}
          </button>
        </form>
      ) : (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl space-y-2">
          <p className="text-xs font-bold text-emerald-400">¡Cuenta creada correctamente! 🎉</p>
          <p className="text-[11px] text-slate-300">Te estamos redirigiendo a tus cursos...</p>
        </div>
      )}

    </div>
  )
}

export default function GraciasPage() {
  return (
    <div className="min-h-screen bg-[#080203] text-slate-100 flex items-center justify-center p-6 font-sans">
      <Suspense fallback={<div className="text-white text-xs">Cargando...</div>}>
        <GraciasContent />
      </Suspense>
    </div>
  )
}
