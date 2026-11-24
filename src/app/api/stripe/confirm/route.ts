import { NextResponse } from 'next/server';
import { accountFor, userFromRequest } from '@/lib/server';
import { stripe, stripeConfigured } from '@/lib/stripe';
import { syncSubscription } from '@/lib/billing';

/** Called when the player returns from Checkout: confirms the payment without waiting for the webhook. */
export async function POST(req: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: 'Pagamentos não configurados.' }, { status: 503 });
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Entre na sua conta.' }, { status: 401 });
  const { sessionId } = await req.json().catch(() => ({}));
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 400 });
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== user.id) return NextResponse.json({ error: 'Este pagamento é de outra conta.' }, { status: 403 });
  if (session.status === 'complete' && session.subscription) await syncSubscription(String(session.subscription), user.id);
  return NextResponse.json(await accountFor(user));
}
