'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [identificador, setIdentificador] = useState('') // Puede ser correo o teléfono
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [modoRecuperacion, setModoRecuperacion] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setErrorMsg('')
      setSuccessMsg('')

      let emailParaLogin = identificador.trim()

      // Si el usuario ingresó un número en lugar de un correo, 
      // podemos buscar su correo asociado en tu tabla 'alumnos' de Supabase
      if (!emailParaLogin.includes('@')) {
        const { data: alumnoData, error: alumnoError } = await supabase
          .from('alumnos')
          .select('correo')
          .eq('telefono', emailParaLogin)
          .single()

        if (alumnoError || !alumnoData) {
          throw new Error('No encontramos ningún alumno registrado con ese teléfono.')
        }
        emailParaLogin = alumnoData.correo
      }

      // Autenticación oficial en Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailParaLogin,
        password,
      })

      if (error) throw error

      // Redirigir al portal unificado de cursos
      window.location.href = '/mis-cursos'

    } catch (err) {
      setErrorMsg(err.message || 'Credenciales incorrectas. Verifica tus datos.')
      setLoading(false)
    }
  }

  const handleRecuperarPassword = async (e) => {
    e.preventDefault()
    if (!identificador) {
      return setErrorMsg('Por favor ingresa tu correo electrónico para recuperar tu contraseña.')
    }

    try {
      setLoading(true)
      setErrorMsg('')
      setSuccessMsg('')

      const { error } = await supabase.auth.resetPasswordForEmail(identificador, {
        redirectTo: 'https://espiritistasacantar.com/login',
      })

      if (error) throw error

      setSuccessMsg('Te hemos enviado un correo con las instrucciones para restablecer tu contraseña.')
      setLoading(false)
    } catch (err) {
      setErrorMsg(err.message || 'Error al enviar el correo de recuperación.')
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
          <h1 className="text-xl font-black text-slate-900">
            {modoRecuperacion ? 'Recuperar Contraseña' : 'Iniciar Sesión'}
          </h1>
          <p className="text-xs text-slate-500">
            {modoRecuperacion 
              ? 'Ingresa tu correo para enviarte un enlace de recuperación.' 
              : 'Ingresa a tu portal de alumno para ver tus clases y materiales.'}
          </p>
        </div>

        {!modoRecuperacion ? (
          /* FORMULARIO DE LOGIN NORMAL */
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Correo Electrónico o Teléfono
              </label>
              <input 
                type="text" 
                required
                placeholder="tucorreo@gmail.com o teléfono"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 outline-none focus:border-rose-600 transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase text-slate-600">Contraseña</label>
                <button 
                  type="button"
                  onClick={() => { setModoRecuperacion(true); setErrorMsg(''); }}
                  className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
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
        ) : (
          /* FORMULARIO DE RECUPERACIÓN */
          <form onSubmit={handleRecuperarPassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                Tu Correo Electrónico Registrado
              </label>
              <input 
                type="email" 
                required
                placeholder="tucorreo@gmail.com"
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 outline-none focus:border-rose-600 transition"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100 text-center font-medium">
                {errorMsg}
              </p>
            )}

            {successMsg && (
              <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center font-medium">
                {successMsg}
              </p>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition cursor-pointer"
            >
              {loading ? 'Enviando enlace...' : 'Enviar instrucciones 📨'}
            </button>

            <button 
              type="button"
              onClick={() => { setModoRecuperacion(false); setErrorMsg(''); setSuccessMsg(''); }}
              className="w-full text-xs text-slate-500 hover:text-slate-900 font-semibold py-2 cursor-pointer"
            >
              ← Regresar al inicio de sesión
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400">
            ¿Tienes problemas para entrar? Contáctanos por WhatsApp para apoyarte.
          </p>
        </div>

      </div>
    </div>
  )
}
