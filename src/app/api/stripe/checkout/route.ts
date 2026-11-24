import { NextResponse } from 'next/server';
import { PRICE_CENTS, MONTHLY_LIMIT, supabaseAdmin, userFromRequest } from '@/lib/server';
import { siteUrl, stripe, stripeConfigured } from '@/lib/stripe';

export async function POST(req: Request) {
  if (!stripeConfigured() || !supabaseAdmin()) return NextResponse.json({ error: 'Pagamentos ainda não estão configurados.' }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Entre na sua conta para assinar.' }, { status: 401 });
  const sb = supabaseAdmin()!;
  const { data: sub } = await sb.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  const base = siteUrl(req);
  const line = process.env.STRIPE_PRICE_ID
    ? { price: process.env.STRIPE_PRICE_ID, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: 'brl',
          unit_amount: PRICE_CENTS(),
          recurring: { interval: 'month' as const },
          product_data: { name: 'ÁLIBI — Assinatura', description: `Até ${MONTHLY_LIMIT()} casos novos por mês` },
        },
      };
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [line],
    client_reference_id: user.id,
    customer: sub?.stripe_customer_id || undefined,
    customer_email: sub?.stripe_customer_id ? undefined : user.email,
    subscription_data: { metadata: { user_id: user.id } },
    metadata: { user_id: user.id },
    locale: 'pt-BR',
    allow_promotion_codes: true,
    success_url: `${base}/assinar?status=ok`,
    cancel_url: `${base}/assinar?status=cancelado`,
  });
  return NextResponse.json({ url: session.url });
}
