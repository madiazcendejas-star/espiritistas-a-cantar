import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const buf = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email || session.customer_details?.email;
    const nombre = session.customer_details?.name || 'Estudiante';
    const telefono = session.customer_details?.phone || '';
    
    // Capturamos el curso o grupo que viajó desde los metadatos de Stripe
    const cursoId = session.metadata?.curso_id;
    const grupoId = session.metadata?.grupo_id;
    const montoTotal = session.amount_total ? session.amount_total / 100 : 0;

    if (email) {
      try {
        // 1. Verificar si el alumno ya existe en la tabla 'alumnos' o crearlo
        let { data: alumno, error: errAlumnoQuery } = await supabase
          .from('alumnos')
          .select('id')
          .eq('correo', email)
          .single();

        let alumnoId;

        if (!alumno) {
          // Si no existe, lo damos de alta automáticamente
          const { data: nuevoAlumno, error: errCrearAlumno } = await supabase
            .from('alumnos')
            .insert([{ nombre, correo: email, telefono, estatus: 'activo' }])
            .select()
            .single();

          if (errCrearAlumno) {
            console.error('Error al crear alumno en webhook:', errCrearAlumno);
            return NextResponse.json({ error: 'Error creando alumno' }, { status: 500 });
          }
          alumnoId = nuevoAlumno.id;
        } else {
          alumnoId = alumno.id;
        }

        // 2. Registrar la inscripción al grupo/curso si viene el ID
        if (grupoId) {
          await supabase.from('inscripciones').insert([{
            alumno_id: alumnoId,
            grupo_id: Number(grupoId),
            estatus: 'activa'
          }]);
        }

        // 3. Registrar el pago exitoso en tu tabla 'pagos'
        await supabase.from('pagos').insert([{
          alumno_id: alumnoId,
          grupo_id: grupoId ? Number(grupoId) : null,
          monto: montoTotal,
          estatus: 'Pagado',
          fecha_pago: new Date().toISOString()
        }]);

      } catch (dbError) {
        console.error('Error interno procesando el pago en Supabase:', dbError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
