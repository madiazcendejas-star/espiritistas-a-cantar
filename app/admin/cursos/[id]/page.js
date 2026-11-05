'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function DetalleCursoPage() {
  const params = useParams()
  const router = useRouter()
  const cursoId = params.id

  const [curso, setCurso] = useState(null)
  const [grupos, setGrupos] = useState([])
  const [lecciones, setLecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [pestanaActiva, setPestanaActiva] = useState('detalles')

  // Estado para la nueva lección
  const [formLeccion, setFormLeccion] = useState({ titulo: '', video_url: '', orden: 1 })
  const [guardandoLeccion, setGuardandoLeccion] = useState(false)

  // Estado con los campos extendidos para enriquecer la información del curso
  const [formEdicion, setFormEdicion] = useState({ 
    Nombre_curso: '', 
    descripcion: '', 
    precio: '', 
    duracion: '',
    modalidad: 'en_linea',
    lo_que_aprenderas: '',
    visible_web: true,
    proximo: false 
  })
  const [guardando, setGuardando] = useState(false)

  // Estado para la subida de imagen directa desde el equipo
  const [imagenArchivo, setImagenArchivo] = useState(null)
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [subiendoPdf, setSubiendoPdf] = useState(false)

  useEffect(() => {
    if (cursoId) cargarDatosCurso()
  }, [cursoId])

  const cargarDatosCurso = async () => {
    setLoading(true)
    const { data: resCurso } = await supabase.from('cursos').select('*').eq('id', cursoId).single()
    const { data: resGrupos } = await supabase.from('grupos').select('*').eq('curso_id', cursoId)
    const { data: resLecciones } = await supabase.from('lecciones_lms').select('*').eq('curso_id', cursoId).order('orden', { ascending: true })

    if (resCurso) {
      setCurso(resCurso)
      setFormEdicion({
        Nombre_curso: resCurso.Nombre_curso || resCurso.nombre_curso || '',
        descripcion: resCurso.descripcion || '',
        precio: resCurso.precio || '',
        duracion: resCurso.duracion || '',
        modalidad: resCurso.modalidad || 'en_linea',
        lo_que_aprenderas: resCurso.lo_que_aprenderas || '',
        visible_web: resCurso.visible_web ?? true,
        proximo: resCurso.proximo ?? false
      })
    }
    if (resGrupos) setGrupos(resGrupos)
    if (resLecciones) {
      setLecciones(resLecciones)
      setFormLeccion(prev => ({ ...prev, orden: resLecciones.length + 1 }))
    }
    setLoading(false)
  }

  const guardarCambios = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const { error } = await supabase
      .from('cursos')
      .update({
        Nombre_curso: formEdicion.Nombre_curso.trim(),
        descripcion: formEdicion.descripcion.trim(),
        precio: Number(formEdicion.precio) || 0,
        duracion: formEdicion.duracion.trim(),
        modalidad: formEdicion.modalidad,
        lo_que_aprenderas: formEdicion.lo_que_aprenderas.trim(),
        visible_web: formEdicion.visible_web,
        proximo: formEdicion.proximo
      })
      .eq('id', cursoId)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      alert('¡Información del curso actualizada exitosamente!')
      cargarDatosCurso()
    }
    setGuardando(false)
  }

  // AGREGAR LECCIÓN / CLASE GRABADA
  const agregarLeccion = async (e) => {
    e.preventDefault()
    setGuardandoLeccion(true)

    const { error } = await supabase.from('lecciones_lms').insert([{
      curso_id: cursoId,
      titulo: formLeccion.titulo.trim(),
      video_url: formLeccion.video_url.trim(),
      orden: Number(formLeccion.orden) || 1
    }])

    if (error) {
      alert('Error al agregar lección: ' + error.message)
    } else {
      setFormLeccion({ titulo: '', video_url: '', orden: lecciones.length + 2 })
      cargarDatosCurso()
    }
    setGuardandoLeccion(false)
  }

  // ELIMINAR LECCIÓN
  const eliminarLeccion = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta clase?')) return
    const { error } = await supabase.from('lecciones_lms').delete().eq('id', id)
    if (!error) cargarDatosCurso()
  }

  // FUNCIÓN PARA SUBIR LA IMAGEN LIMPIANDO ACENTOS Y ESPACIOS
  const subirImagenCurso = async (e) => {
    e.preventDefault()
    if (!imagenArchivo) return alert('Selecciona una imagen primero.')

    setSubiendoImagen(true)

    const nombreLimpio = imagenArchivo.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')

    const nombreArchivo = `${Date.now()}_${nombreLimpio}`
    const { error: uploadError } = await supabase.storage
      .from('cursos')
      .upload(nombreArchivo, imagenArchivo)

    if (uploadError) {
      setSubiendoImagen(false)
      return alert('Error al subir la imagen: ' + uploadError.message)
    }

    const { data: publicUrlData } = supabase.storage
      .from('cursos')
      .getPublicUrl(nombreArchivo)

    const urlPublica = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from('cursos')
      .update({ imagen: urlPublica })
      .eq('id', cursoId)

    if (updateError) {
      alert('Imagen subida, pero error al actualizar el curso en la base de datos: ' + updateError.message)
    } else {
      alert('¡Imagen de portada actualizada con éxito!')
      setImagenArchivo(null)
      cargarDatosCurso()
    }
    setSubiendoImagen(false)
  }

  // FUNCIÓN PARA SUBIR EL MANUAL PDF DESDE EL ADMIN
  const subirPdfManual = async (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return

    setSubiendoPdf(true)
    const nombreLimpio = archivo.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9.-]/g, '_')

    const nombreArchivo = `pdf_${Date.now()}_${nombreLimpio}`
    
    const { error: uploadError } = await supabase.storage
      .from('cursos')
      .upload(nombreArchivo, archivo)

    if (uploadError) {
      setSubiendoPdf(false)
      return alert('Error al subir el PDF: ' + uploadError.message)
    }

    const { data: publicUrlData } = supabase.storage
      .from('cursos')
      .getPublicUrl(nombreArchivo)

    const urlPdf = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from('cursos')
      .update({ manual_pdf_url: urlPdf })
      .eq('id', cursoId)

    if (updateError) {
      alert('PDF subido pero error al guardar en la base de datos: ' + updateError.message)
    } else {
      alert('¡Manual en PDF subido y vinculado con éxito! 📄')
      cargarDatosCurso()
    }
    setSubiendoPdf(false)
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm font-bold">Cargando expediente del curso...</div>
  }

  if (!curso) {
    return <div className="h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500 text-sm font-bold">Curso no encontrado.</div>
  }

  const nombreCurso = curso.Nombre_curso || curso.nombre_curso || 'Curso sin nombre'
  const imagenActual = curso.imagen || curso.foto_url || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8fafc] font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0f1d] text-slate-300 hidden lg:flex flex-col border-r border-slate-800/60 z-20 flex-shrink-0">
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-sm shadow-md">EC</div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-sm leading-tight">Espiritistas a Cantar</span>
              <span className="text-xs text-indigo-400 font-medium">Panel Administrativo</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto text-sm font-medium">
          <div className="px-3 pb-2 text-xs uppercase tracking-wider text-slate-500 font-bold">Gestión</div>
          <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏠 Inicio</a>
          <a href="/admin/estudiantes" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🎓 Estudiantes</a>
          <a href="/admin/cursos" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-sm">📚 Cursos / Programas</a>
          <a href="/admin/grupos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">🏛️ Grupos y Horarios</a>
          <a href="/admin/inscripciones" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">📋 Inscripciones</a>
          <a href="/admin/pagos" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition">💳 Pagos y Finanzas</a>
        </nav>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto">
        
        <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-10 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/cursos')} 
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{nombreCurso}</h1>
              <p className="text-xs text-slate-500 font-medium">Gestiona los detalles del curso, imágenes y clases grabadas</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-2xl">
              <span className="text-xs font-bold text-slate-700">Visible en la web</span>
              <input 
                type="checkbox" 
                checked={formEdicion.visible_web}
                onChange={(e) => setFormEdicion({ ...formEdicion, visible_web: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
              <span className="text-xs font-bold text-indigo-900">🌟 Curso Próximo</span>
              <input 
                type="checkbox" 
                checked={formEdicion.proximo}
                onChange={(e) => setFormEdicion({ ...formEdicion, proximo: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto w-full space-y-8">
          
          {/* PESTAÑAS DE NAVEGACIÓN */}
          <div className="flex gap-8 border-b border-slate-200 text-sm font-bold">
            <button 
              onClick={() => setPestanaActiva('detalles')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'detalles' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              📝 Detalles
            </button>
            <button 
              onClick={() => setPestanaActiva('grupos')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'grupos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              🏛️ Grupos <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">{grupos.length}</span>
            </button>
            <button 
              onClick={() => setPestanaActiva('lecciones')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'lecciones' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              🎬 Lecciones / Clases <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">{lecciones.length}</span>
            </button>
            <button 
              onClick={() => setPestanaActiva('imagenes')}
              className={`pb-4 border-b-2 transition flex items-center gap-2 ${pestanaActiva === 'imagenes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
            >
              🖼️ Imágenes
            </button>
          </div>

          {/* CONTENIDO PESTAÑA: DETALLES */}
          {pestanaActiva === 'detalles' && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
                <h3 className="text-base font-extrabold text-slate-900">Información General y Comercial</h3>
                
                <form onSubmit={guardarCambios} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Título del Curso</label>
                    <input 
                      type="text" 
                      required
                      value={formEdicion.Nombre_curso}
                      onChange={(e) => setFormEdicion({ ...formEdicion, Nombre_curso: e.target.value })}
                      className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-bold bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Precio / Inversión ($ MXN)</label>
                      <input 
                        type="number"
                        value={formEdicion.precio}
                        onChange={(e) => setFormEdicion({ ...formEdicion, precio: e.target.value })}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Duración</label>
                      <input 
                        type="text"
                        value={formEdicion.duracion}
                        onChange={(e) => setFormEdicion({ ...formEdicion, duracion: e.target.value })}
                        placeholder="Ej. 2 meses / 4 clases"
                        className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Modalidad</label>
                      <select
                        value={formEdicion.modalidad}
                        onChange={(e) => setFormEdicion({ ...formEdicion, modalidad: e.target.value })}
                        className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                      >
                        <option value="en_linea">💻 En Línea</option>
                        <option value="presencial">📍 Presencial</option>
                        <option value="hibrido">🔀 Híbrido</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Descripción General</label>
                    <textarea 
                      rows="3"
                      value={formEdicion.descripcion}
                      onChange={(e) => setFormEdicion({ ...formEdicion, descripcion: e.target.value })}
                      placeholder="Breve introducción atractiva..."
                      className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none resize-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Lo que aprenderás (Temario o viñetas)</label>
                    <textarea 
                      rows="4"
                      value={formEdicion.lo_que_aprenderas}
                      onChange={(e) => setFormEdicion({ ...formEdicion, lo_que_aprenderas: e.target.value })}
                      placeholder="• Introducción
• Práctica avanzada..."
                      className="w-full p-4 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none resize-none focus:bg-white"
                    />
                  </div>

                  {/* SECCIÓN NUEVA: SUBIR MANUAL PDF */}
                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Manual o Recurso en PDF</label>
                    <input 
                      type="file"
                      accept="application/pdf"
                      onChange={subirPdfManual}
                      className="w-full p-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                    />
                    {subiendoPdf && <p className="text-xs text-indigo-600 font-semibold mt-2">Subiendo PDF...</p>}
                    {curso.manual_pdf_url && (
                      <p className="text-xs text-emerald-600 font-semibold mt-2">
                        ✅ PDF actual cargado correctamente (<a href={curso.manual_pdf_url} target="_blank" rel="noreferrer" className="underline font-bold">Ver archivo PDF</a>)
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button 
                      type="submit" 
                      disabled={guardando} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                    >
                      {guardando ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* CONTENIDO PESTAÑA: GRUPOS */}
          {pestanaActiva === 'grupos' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs p-6 text-sm text-slate-600 font-medium">
                {grupos.length === 0 ? (
                  <p className="text-slate-400 italic">No hay grupos asociados a este curso todavía.</p>
                ) : (
                  <ul className="space-y-2">
                    {grupos.map(g => (
                      <li key={g.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-900">{g.nombre_grupo || g.nombre || 'Grupo'}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">Cupo: {g.capacidad_maxima || 'N/A'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* CONTENIDO PESTAÑA: LECCIONES (NUEVO LMS) */}
          {pestanaActiva === 'lecciones' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* LISTA DE LECCIONES */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Clases Grabadas del Curso ({lecciones.length})</h3>
                
                {lecciones.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 font-medium text-sm">
                    Aún no hay clases registradas. Agrega la primera lección desde el panel derecho. 🚀
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lecciones.map((l, index) => (
                      <div key={l.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                            {l.orden || index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{l.titulo}</h4>
                            <p className="text-xs text-slate-400 truncate max-w-sm">{l.video_url}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => eliminarLeccion(l.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold px-3 py-1.5 rounded-xl hover:bg-rose-50 transition cursor-pointer"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FORMULARIO PARA NUEVA LECCIÓN */}
              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Agregar Clase</h3>
                <form onSubmit={agregarLeccion} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Título de la Clase *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. Clase 1: Introducción"
                      value={formLeccion.titulo}
                      onChange={(e) => setFormLeccion({ ...formLeccion, titulo: e.target.value })}
                      className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Enlace del Video *</label>
                    <input 
                      type="url" 
                      required
                      placeholder="https://www.youtube.com/embed/..."
                      value={formLeccion.video_url}
                      onChange={(e) => setFormLeccion({ ...formLeccion, video_url: e.target.value })}
                      className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Número de Orden</label>
                    <input 
                      type="number" 
                      value={formLeccion.orden}
                      onChange={(e) => setFormLeccion({ ...formLeccion, orden: e.target.value })}
                      className="w-full p-3.5 border border-slate-200 rounded-2xl text-sm font-medium bg-slate-50 outline-none focus:bg-white"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={guardandoLeccion}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    {guardandoLeccion ? 'Guardando...' : 'Añadir Lección 🎬'}
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* CONTENIDO PESTAÑA: IMÁGENES */}
          {pestanaActiva === 'imagenes' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 space-y-6 shadow-xs max-w-xl">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Gestión de Imágenes y Miniaturas</h3>
                <p className="text-xs text-slate-500">Sube la portada oficial para las landings públicas y el portal de los alumnos.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-bold uppercase text-slate-400 mb-2">Portada actual en uso:</span>
                  <img 
                    src={imagenActual} 
                    alt="Portada del curso" 
                    className="w-full h-48 object-cover rounded-2xl border border-slate-200 shadow-xs"
                  />
                </div>

                <form onSubmit={subirImagenCurso} className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Seleccionar nueva imagen desde tu equipo</label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImagenArchivo(e.target.files[0])}
                      className="w-full p-2.5 border border-slate-200 rounded-2xl text-xs bg-slate-50 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                    />
                  </div>

                  <div className="text-right">
                    <button 
                      type="submit"
                      disabled={subiendoImagen || !imagenArchivo}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
                    >
                      {subiendoImagen ? 'Subiendo imagen...' : 'Subir y actualizar portada'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  )
}
