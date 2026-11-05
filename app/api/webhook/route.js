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

    if (email) {
      try {
        const { error } = await supabase
          .from('user_courses')
          .insert([
            { 
              user_email: email, 
              course_id: 'baraja-espanola', 
              purchased_at: new Date().toISOString() 
            }
          ]);

        if (error) {
          console.error('Error al otorgar acceso en Supabase:', error);
        }
      } catch (dbError) {
        console.error('Error interno de base de datos:', dbError);
      }
    }
  }

  return NextResponse.json({ received: true });
}
