'use client'

import { useState, Suspense } from 'react'
import { supabase } from '../../lib/supabase'

function GraciasContent() {
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [activando, setActivando] = useState(false)

  const handleActivarCuenta = async (e) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      return setErrorMsg('Por favor ingresa un correo electrónico válido.')
    }
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

      // 2. Guardar o actualizar en la tabla 'alumnos'
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

      // 3. Iniciar sesión automáticamente y redirigir al portal
      await supabase.auth.signInWithPassword({ email, password })
      window.location.href = '/mis-cursos'

    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al activar tu cuenta.')
      setActivando(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
      
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center mx-auto text-lg font-black shadow-lg shadow-rose-600/30">
          ✓
        </div>
        <h1 className="text-xl font-black text-white">¡Pago completado con éxito!</h1>
        <p className="text-xs text-slate-400">
          Tu compra se ha procesado correctamente. Define tu nombre, correo y contraseña para acceder de inmediato a tus clases.
        </p>
      </div>

      <form onSubmit={handleActivarCuenta} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
            Tu Nombre *
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
            Tu Correo Electrónico (Tu Usuario de Acceso) *
          </label>
          <input 
            type="email" 
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@gmail.com"
            className="w-full p-3 border border-slate-800 rounded-xl text-xs bg-slate-950 text-white outline-none focus:border-rose-600 transition"
          />
          <span className="text-[10px] text-slate-500 mt-1 block">Este será tu usuario para entrar al portal.</span>
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
  )
}

export default function GraciasPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
      <Suspense fallback={<div className="text-xs text-slate-400 uppercase tracking-widest animate-pulse">Cargando...</div>}>
        <GraciasContent />
      </Suspense>
    </div>
  )
}
