'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function PortalAlumnoModalManager({ alumnoId }) {
  const [mostrarModalValoracion, setMostrarModalValoracion] = useState(false)
  const [mostrarModalPerfil, setMostrarModalPerfil] = useState(false)
  
  const [cursoAPendienteValorar, setCursoAPendienteValorar] = useState(null)
  const [estrellas, setEstrellas] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviandoReseña, setEnviandoReseña] = useState(false)

  const [datosPerfil, setDatosPerfil] = useState({
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    estado: '',
    email: ''
  })
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  useEffect(() => {
    if (alumnoId) {
      verificarPendientesAlCargar()
    }
  }, [alumnoId])

  const verificarPendientesAlCargar = async () => {
    try {
      // 1. Verificar datos obligatorios en el perfil (Nombre, Nacimiento, Estado o Email)
      const { data: alumno } = await supabase
        .from('alumnos')
        .select('*')
        .eq('id', alumnoId)
        .single()

      if (alumno) {
        const faltaNombre = !alumno.nombre && !alumno.Nombre
        const faltaNacimiento = !alumno.fecha_nacimiento && !alumno.Fecha_nacimiento
        const faltaEstado = !alumno.estado && !alumno.Estado
        const faltaEmail = !alumno.email && !alumno.Email

        if (faltaNombre || faltaNacimiento || faltaEstado || faltaEmail) {
          setDatosPerfil({
            nombre: alumno.nombre || alumno.Nombre || '',
            apellidos: alumno.apellidos || alumno.Apellidos || '',
            fecha_nacimiento: alumno.fecha_nacimiento || alumno.Fecha_nacimiento || '',
            estado: alumno.estado || alumno.Estado || '',
            email: alumno.email || alumno.Email || ''
          })
          setMostrarModalPerfil(true)
          return 
        }
      }

      // 2. Verificar cursos completados sin valorar
      const { data: inscripciones } = await supabase
        .from('inscripciones')
        .select('*, grupos(curso_id, cursos(id, nombre_curso, Nombre_curso))')
        .eq('alumno_id', alumnoId)

      if (inscripciones && inscripciones.length > 0) {
        const { data: valoracionesPrevias } = await supabase
          .from('valoraciones')
          .select('curso_id')
          .eq('alumno_id', alumnoId)

        const cursosValoradosIds = new Set(valoracionesPrevias?.map(v => v.curso_id) || [])

        const pendiente = inscripciones.find(ins => {
          const estatusInscripcion = (ins.estatus || ins.estado || '').toLowerCase()
          const cursoId = ins.grupos?.cursos?.id || ins.grupos?.curso_id
          return (estatusInscripcion === 'completado' || estatusInscripcion === 'terminado') && cursoId && !cursosValoradosIds.has(cursoId)
        })

        if (pendiente) {
          setCursoAPendienteValorar({
            cursoId: pendiente.grupos?.cursos?.id || pendiente.grupos?.curso_id,
            nombreCurso: pendiente.grupos?.cursos?.nombre_curso || pendiente.grupos?.cursos?.Nombre_curso || 'Curso Académico'
          })
          setMostrarModalValoracion(true)
        }
      }
    } catch (error) {
      console.error("Error al verificar pendientes:", error)
    }
  }

  const handleEnviarValoracion = async (e) => {
    e.preventDefault()
    if (!cursoAPendienteValorar) return
    setEnviandoReseña(true)

    try {
      const { error } = await supabase.from('valoraciones').insert([{
        alumno_id: alumnoId,
        curso_id: cursoAPendienteValorar.cursoId,
        estrellas: estrellas,
        comentario: comentario,
        created_at: new Date().toISOString()
      }])

      if (!error) {
        setMostrarModalValoracion(false)
      }
    } catch (err) {
      console.error("Error al enviar valoración:", err)
    } finally {
      setEnviandoReseña(false)
    }
  }

  const handleGuardarPerfil = async (e) => {
    e.preventDefault()
    setGuardandoPerfil(true)

    try {
      const { error } = await supabase
        .from('alumnos')
        .update({
          nombre: datosPerfil.nombre,
          apellidos: datosPerfil.apellidos,
          fecha_nacimiento: datosPerfil.fecha_nacimiento,
          estado: datosPerfil.estado,
          email: datosPerfil.email
        })
        .eq('id', alumnoId)

      if (!error) {
        setMostrarModalPerfil(false)
        verificarPendientesAlCargar()
      }
    } catch (err) {
      console.error("Error al actualizar perfil:", err)
    } finally {
      setGuardandoPerfil(false)
    }
  }

  return (
    <>
      {/* MODAL 1: ACTUALIZACIÓN DE DATOS (SIN TELÉFONO) */}
      {mostrarModalPerfil && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl space-y-6 border border-slate-100">
            <div className="space-y-2 text-center">
              <span className="text-3xl">📝</span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Actualiza tu información</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Para fines estadísticos y brindarte mejoras en <span className="font-semibold text-indigo-600">Espiritistas a Cantar</span>, por favor completa tus datos.
              </p>
            </div>

            <form onSubmit={handleGuardarPerfil} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Nombre(s)</label>
                  <input 
                    type="text" 
                    required
                    value={datosPerfil.nombre}
                    onChange={(e) => setDatosPerfil({...datosPerfil, nombre: e.target.value})}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Apellidos</label>
                  <input 
                    type="text" 
                    required
                    value={datosPerfil.apellidos}
                    onChange={(e) => setDatosPerfil({...datosPerfil, apellidos: e.target.value})}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Correo Electrónico</label>
                <input 
                  type="email" 
                  required
                  value={datosPerfil.email}
                  onChange={(e) => setDatosPerfil({...datosPerfil, email: e.target.value})}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  required
                  value={datosPerfil.fecha_nacimiento}
                  onChange={(e) => setDatosPerfil({...datosPerfil, fecha_nacimiento: e.target.value})}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Estado / Dirección (Residencia)</label>
                <input 
                  type="text" 
                  required
                  value={datosPerfil.estado}
                  onChange={(e) => setDatosPerfil({...datosPerfil, estado: e.target.value})}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600"
                  placeholder="Ej. Estado de México"
                />
              </div>

              <button 
                type="submit" 
                disabled={guardandoPerfil}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm mt-2"
              >
                {guardandoPerfil ? 'Guardando...' : 'Guardar y Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VALORACIÓN DE CURSO TERMINADO */}
      {mostrarModalValoracion && cursoAPendienteValorar && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl space-y-6 border border-slate-100">
            <div className="space-y-2 text-center">
              <span className="text-3xl">🌟</span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">¡Felicitaciones por terminar!</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Has concluido el curso <span className="font-bold text-slate-800">"{cursoAPendienteValorar.nombreCurso}"</span>. ¿Cómo calificarías tu experiencia?
              </p>
            </div>

            <form onSubmit={handleEnviarValoracion} className="space-y-5">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    type="button"
                    key={num}
                    onClick={() => setEstrellas(num)}
                    className={`text-3xl transition-transform hover:scale-110 ${
                      num <= estrellas ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase">Comentario u opinión (Opcional)</label>
                <textarea 
                  rows="3"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-indigo-600 resize-none"
                  placeholder="¿Qué te pareció el curso o los temas?"
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={enviandoReseña}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
              >
                {enviandoReseña ? 'Enviando...' : 'Enviar Valoración'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
