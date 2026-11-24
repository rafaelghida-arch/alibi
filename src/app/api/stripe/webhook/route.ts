import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/server';
import { stripe } from '@/lib/stripe';
import { syncSubscription } from '@/lib/billing';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret || !supabaseAdmin()) return NextResponse.json({ error: 'não configurado' }, { status: 503 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch (e) {
    console.error('[webhook] assinatura inválida', (e as Error).message);
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 400 });
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === 'subscription' && s.subscription) await syncSubscription(String(s.subscription), s.client_reference_id);
    } else if (event.type.startsWith('customer.subscription.')) {
      await syncSubscription((event.data.object as Stripe.Subscription).id);
    }
  } catch (e) {
    console.error('[webhook]', event.type, (e as Error).message);
    return NextResponse.json({ error: 'falha ao processar' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
