import { NextResponse } from 'next/server';
import { accountFor, supabaseAdmin, userFromRequest } from '@/lib/server';
import { stripe, stripeConfigured } from '@/lib/stripe';
import { syncSubscription } from '@/lib/billing';

/** Cancels at the end of the paid period (or resumes, with { resume: true }). */
export async function POST(req: Request) {
  if (!stripeConfigured() || !supabaseAdmin()) return NextResponse.json({ error: 'Pagamentos não configurados.' }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 });
  const { resume } = await req.json().catch(() => ({}));
  const { data } = await supabaseAdmin()!.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).maybeSingle();
  if (!data?.stripe_subscription_id) return NextResponse.json({ error: 'Nenhuma assinatura encontrada.' }, { status: 404 });
  await stripe().subscriptions.update(data.stripe_subscription_id, { cancel_at_period_end: !resume });
  await syncSubscription(data.stripe_subscription_id, user.id);
  return NextResponse.json(await accountFor(user));
}
