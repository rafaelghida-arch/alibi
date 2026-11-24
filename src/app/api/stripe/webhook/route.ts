import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sb = supabaseAdmin();
  if (!secret || !sb) return NextResponse.json({ error: 'não configurado' }, { status: 503 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 400 });
  }

  async function upsertFrom(subId: string, userIdHint?: string | null) {
    const s = await stripe().subscriptions.retrieve(subId);
    const userId = userIdHint || s.metadata?.user_id;
    if (!userId) return;
    const item = s.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number };
    const anyS = s as unknown as { current_period_start?: number; current_period_end?: number };
    const start = item?.current_period_start ?? anyS.current_period_start;
    const end = item?.current_period_end ?? anyS.current_period_end;
    await sb!.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer.id,
      stripe_subscription_id: s.id,
      status: s.status,
      current_period_start: start ? new Date(start * 1000).toISOString() : null,
      current_period_end: end ? new Date(end * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === 'subscription' && s.subscription) await upsertFrom(String(s.subscription), s.client_reference_id);
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const s = event.data.object as Stripe.Subscription;
      await upsertFrom(s.id);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
