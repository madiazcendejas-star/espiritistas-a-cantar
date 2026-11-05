import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    // Opcional: Puedes recibir el curso_id y grupo_id desde el frontend si lo deseas, 
    // o definirlos aquí directamente para este producto.
    const body = await req.json().catch(() => ({}));
    const cursoId = body.curso_id || '1'; // ID por defecto o recibido
    const grupoId = body.grupo_id || '5'; // ID del grupo por defecto o recibido

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_BARAJA,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cursos/baraja-espanola`,
      
      // 🌟 AQUÍ PASAMOS LOS METADATOS QUE LEE EL WEBHOOK 🌟
      metadata: {
        curso_id: String(cursoId),
        grupo_id: String(grupoId)
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
