'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function GraciasPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [activando, setActivando] = useState(false)

  // Consultar los datos reales de la sesión de Stripe al cargar la página
  useEffect(() => {
    async function fetchStripeSession() {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/checkout-session?session_id=${sessionId}`)
        const data = await response.json()

        if (data.email) setEmail(data.email)
        if (data.nombre) setNombre(data.nombre)
      } catch (err) {
        console.error('Error al obtener datos de Stripe:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStripeSession()
  }, [sessionId])

  const handleActivarCuenta = async (e) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      return setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
    }

    try {
      setActivando(true)
      setErrorMsg('')

      // 1. Crear el usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre }
        }
      })

      if (authError) throw authError

      // 2. Guardar o actualizar los datos del alumno en tu tabla 'alumnos' con su nombre real
      const { error: dbError } = await supabase
        .from('alumnos')
        .upsert([
          { 
            correo: email, 
            nombre: nombre || 'Estudiante',
            auth_id: authData.user?.id 
          }
        ], { onConflict: 'correo' })

      if (dbError) {
        console.error('Error guardando en tabla alumnos:', dbError)
      }

      // 3. Iniciar sesión automáticamente y mandar al portal
      await supabase.auth.signInWithPassword({ email, password })
      window.location.href = '/mis-cursos'

    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al activar tu cuenta.')
      setActivando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center font-sans">
        <p className="text-xs tracking-widest uppercase animate-pulse">Verificando tu compra...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center mx-auto text-lg font-black shadow-lg shadow-rose-600/30">
            ✓
          </div>
          <h1 className="text-xl font-black text-white">¡Pago completado con éxito!</h1>
          <p className="text-xs text-slate-400">
            {nombre ? `¡Hola, ${nombre}! Tu` : 'Tu'} compra se ha procesado correctamente. Define tu contraseña para acceder de inmediato a tus clases.
          </p>
        </div>

        <form onSubmit={handleActivarCuenta} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Tu Nombre
            </label>
            <input 
              type="text" 
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre completo"
              className="w-full p-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white outline-none focus:border-rose-600 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Tu Correo (Registrado en Stripe)
            </label>
            <input 
              type="email" 
              disabled
              value={email}
              className="w-full p-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-slate-400 cursor-not-allowed outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Este correo viene directamente de tu pago y es tu usuario de acceso.</span>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
              Crea tu Contraseña *
            </label>
            <input 
              type="password" 
              required
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white outline-none focus:border-rose-600 transition"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/50 p-3 rounded-xl border border-rose-900 text-center font-medium">
              {errorMsg}
            </p>
          )}

          <button 
            type="submit"
            disabled={activando}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-lg shadow-rose-600/30 transition cursor-pointer"
          >
            {activando ? 'Activando tu cuenta...' : '🚀 Activar mi cuenta y entrar'}
          </button>
        </form>

      </div>
    </div>
  )
}
