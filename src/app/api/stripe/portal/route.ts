import { NextResponse } from 'next/server';
import { supabaseAdmin, userFromRequest } from '@/lib/server';
import { siteUrl, stripe, stripeConfigured } from '@/lib/stripe';

export async function POST(req: Request) {
  if (!stripeConfigured() || !supabaseAdmin()) return NextResponse.json({ error: 'Pagamentos ainda não estão configurados.' }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 });
  const { data: sub } = await supabaseAdmin()!.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!sub?.stripe_customer_id) return NextResponse.json({ error: 'Nenhuma assinatura encontrada.' }, { status: 404 });
  const portal = await stripe().billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${siteUrl(req)}/assinar`, locale: 'pt-BR' });
  return NextResponse.json({ url: portal.url });
}
