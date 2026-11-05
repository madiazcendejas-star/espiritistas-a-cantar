import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resend = new Resend(process.env.RESEND_API_KEY);

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
    
    const cursoId = session.metadata?.curso_id;
    const grupoId = session.metadata?.grupo_id;
    const montoTotal = session.amount_total ? session.amount_total / 100 : 0;

    if (email) {
      try {
        // 1. Verificar si el alumno ya existe en la tabla 'alumnos' o crearlo
        let { data: alumno } = await supabase
          .from('alumnos')
          .select('id')
          .eq('correo', email)
          .single();

        let alumnoId;

        if (!alumno) {
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

        // 4. Enviar correo automático de bienvenida con Resend (usando tu dominio)
        try {
          await resend.emails.send({
            from: 'Espiritistas a Cantar <contacto@espiritistasacantar.com>',
            to: [email],
            subject: '¡Bienvenido al Taller de Baraja Española! Acceso inmediato 🎉',
            html: `
              <div style="font-family: sans-serif; background-color: #080203; color: #f8fafc; padding: 30px; border-radius: 20px;">
                <h2 style="color: #ef4444;">¡Hola, ${nombre}!</h2>
                <p>Tu pago se ha procesado con éxito. Ya tienes acceso completo al <strong>Taller de Baraja Española</strong>.</p>
                
                <p>Tus datos de acceso a la plataforma son:</p>
                <ul style="background: #110306; padding: 15px; border-radius: 10px; list-style: none;">
                  <li><strong>Usuario (Correo):</strong> ${email}</li>
                  <li><strong>Plataforma:</strong> <a href="https://espiritistasacantar.com/login" style="color: #f87171;">Iniciar Sesión aquí</a></li>
                </ul>

                <p>Si tienes cualquier duda, recuerda que cuentas con soporte directo por WhatsApp.</p>
                <p>¡Mucho éxito en tu aprendizaje!</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">Espiritistas a Cantar</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Error al enviar el correo de confirmación con Resend:', emailError);
        }

      } catch (dbError) {
        console.error('Error interno procesando el pago en Supabase:', dbError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
