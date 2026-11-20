import { NextResponse } from 'next/server'
import { getStripe, cumplirCheckout } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Misma ruta que usa hoy la app anterior: el endpoint configurado en Stripe no cambia.
export async function POST(req) {
  let event
  try {
    const stripe = getStripe()
    const cuerpo = await req.text()
    event = stripe.webhooks.constructEvent(cuerpo, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      // Tarjeta: llega pagado. OXXO / SPEI: llega "sin pagar" y luego llega async_payment_succeeded.
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const r = await cumplirCheckout(event.data.object)
        if (r.estado === 'error') console.error('Webhook: no se pudo registrar', event.id)
        break
      }
      case 'checkout.session.async_payment_failed':
        console.warn('Pago OXXO/SPEI no completado', event.data.object.id)
        break
      default:
        break
    }
  } catch (err) {
    // 500 para que Stripe reintente más tarde.
    console.error('Webhook: error procesando', event.type, err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
  return NextResponse.json({ received: true })
}
