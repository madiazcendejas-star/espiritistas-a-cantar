create sequence alumno_tandas_id_seq;
create sequence tanda_pagos_id_seq;
create sequence grupos_id_seq;
create sequence recursos_id_seq;
create sequence tandas_config_id_seq;
create sequence sesiones_presenciales_libres_id_seq;
create sequence valoraciones_id_seq;
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.alumnos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  matricula text,
  "Nombre" text,
  telefono text,
  correo text,
  password text,
  apellidos text,
  primer_ingreso boolean DEFAULT true,
  fecha_nacimiento date,
  cp text,
  estado text,
  pais text,
  nombre text,
  direccion text,
  email text,
  CONSTRAINT alumnos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cursos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  "Nombre_curso" text NOT NULL,
  fecha_caducidad date,
  descripcion text,
  portada_url text,
  enlace_meet text,
  recomendado_marketing boolean DEFAULT false,
  clases_exigibles integer DEFAULT 2,
  precio numeric DEFAULT 0,
  visible_web boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  foto_url text,
  modalidad text DEFAULT 'en_linea'::text,
  imagen text,
  proximo boolean DEFAULT false,
  duracion text,
  lo_que_aprenderas text,
  manual_pdf_url text,
  CONSTRAINT cursos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inscripciones (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  alumno_id text NOT NULL DEFAULT now(),
  curso_id bigint NOT NULL,
  "Estatus" text NOT NULL DEFAULT ''::text,
  estatus text DEFAULT 'activa'::text,
  grupo_id bigint,
  fecha_inscripcion timestamp without time zone DEFAULT now(),
  motivo_baja text,
  CONSTRAINT inscripciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pagos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  alumno_id bigint NOT NULL,
  curso_id bigint,
  monto numeric NOT NULL,
  fecha_pago date,
  estatus text DEFAULT 'Pendiente'::text,
  fecha_vencimiento date,
  grupo_id bigint,
  comprobante_url text,
  observaciones text,
  monto_real numeric DEFAULT 0,
  CONSTRAINT pagos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.historial_accesos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  alumno_id bigint NOT NULL,
  fecha_acceso timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT historial_accesos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.citas_presenciales (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  alumno_id bigint NOT NULL,
  titulo text NOT NULL,
  fecha_hora timestamp with time zone NOT NULL,
  lugar text,
  estatus text DEFAULT 'Programada'::text,
  CONSTRAINT citas_presenciales_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tandas_misas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  alumno_id bigint NOT NULL,
  numero_tanda integer DEFAULT 1,
  monto_semanal numeric,
  costo_semanal numeric,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  fecha_limite date,
  CONSTRAINT tandas_misas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pagos_tandas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tanda_id bigint NOT NULL,
  alumno_id bigint NOT NULL,
  numero_semana integer NOT NULL,
  fecha_limite date NOT NULL,
  monto numeric NOT NULL,
  estatus text DEFAULT 'Pendiente'::text,
  fecha_pago date,
  CONSTRAINT pagos_tandas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.configuracion_anuncios (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL,
  activo boolean DEFAULT true,
  fecha_actualizacion timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT configuracion_anuncios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.grupos (
  id integer NOT NULL DEFAULT nextval('grupos_id_seq'::regclass),
  curso_id integer,
  nombre_grupo text NOT NULL,
  fecha_inicio date,
  fecha_fin date,
  duracion_acceso text DEFAULT '1_ano'::text,
  costo_total numeric NOT NULL,
  num_pagos integer DEFAULT 1,
  frecuencia text DEFAULT 'mensual'::text,
  nombre text,
  grupo text,
  horario text,
  ocupacion text,
  progreso text,
  costo numeric DEFAULT 0,
  estado text DEFAULT 'activo'::text,
  tipo_modalidad text DEFAULT 'en_linea'::text,
  cuota_inscripcion numeric DEFAULT 0,
  capacidad integer DEFAULT 15,
  horario_texto text,
  info_copiar text,
  enlace_whatsapp text,
  CONSTRAINT grupos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recursos (
  id integer NOT NULL DEFAULT nextval('recursos_id_seq'::regclass),
  grupo_id bigint,
  titulo text NOT NULL,
  tipo text DEFAULT 'video'::text,
  url text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT recursos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tandas_config (
  id integer NOT NULL DEFAULT nextval('tandas_config_id_seq'::regclass),
  nombre character varying NOT NULL,
  total_pagos integer NOT NULL DEFAULT 10,
  monto_por_pago numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tandas_config_pkey PRIMARY KEY (id)
);
CREATE TABLE public.alumno_tandas (
  id integer NOT NULL DEFAULT nextval('alumno_tandas_id_seq'::regclass),
  alumno_id uuid NOT NULL,
  tanda_id integer,
  fecha_misa timestamp with time zone,
  estado character varying DEFAULT 'activa'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT alumno_tandas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tanda_pagos (
  id integer NOT NULL DEFAULT nextval('tanda_pagos_id_seq'::regclass),
  alumno_tanda_id integer,
  numero_pago integer NOT NULL,
  monto numeric NOT NULL,
  estado character varying DEFAULT 'pendiente'::character varying,
  fecha_pago timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tanda_pagos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sesiones_presenciales_libres (
  id integer NOT NULL DEFAULT nextval('sesiones_presenciales_libres_id_seq'::regclass),
  alumno_id uuid NOT NULL,
  titulo_sesion character varying NOT NULL,
  fecha_hora timestamp with time zone NOT NULL,
  notas text,
  estado character varying DEFAULT 'programada'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sesiones_presenciales_libres_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sesiones_grupo (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  grupo_id bigint,
  numero_sesion integer NOT NULL,
  titulo_sesion text NOT NULL,
  fecha_hora timestamp with time zone NOT NULL,
  enlace_meet text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sesiones_grupo_pkey PRIMARY KEY (id)
);
CREATE TABLE public.valoraciones (
  id integer NOT NULL DEFAULT nextval('valoraciones_id_seq'::regclass),
  alumno_id bigint,
  curso_id bigint,
  estrellas integer NOT NULL CHECK (estrellas >= 1 AND estrellas <= 5),
  comentario text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valoraciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.prospectos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  telefono text,
  correo text,
  curso_id bigint,
  estatus text DEFAULT 'Nuevo'::text,
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT prospectos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cursos_lms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  slug text NOT NULL UNIQUE,
  descripcion text,
  stripe_product_id text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT cursos_lms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.accesos_alumnos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  correo_alumno text NOT NULL,
  curso_id uuid,
  tipo_acceso text DEFAULT 'manual'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT accesos_alumnos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lecciones_lms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  curso_id bigint,
  titulo text NOT NULL,
  video_url text NOT NULL,
  orden integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT lecciones_lms_pkey PRIMARY KEY (id)
);