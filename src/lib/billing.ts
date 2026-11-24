import type Stripe from 'stripe';
import { supabaseAdmin } from './server';
import { stripe } from './stripe';

/** Copies a Stripe subscription into the `subscriptions` table. Used by the webhook, the checkout return and cancel. */
export async function syncSubscription(subId: string, userIdHint?: string | null) {
  const sb = supabaseAdmin();
  if (!sb) throw new Error('Supabase não configurado');
  const s = await stripe().subscriptions.retrieve(subId);
  const userId = userIdHint || s.metadata?.user_id;
  if (!userId) throw new Error(`assinatura ${subId} sem user_id`);
  const item = s.items.data[0] as Stripe.SubscriptionItem & { current_period_start?: number; current_period_end?: number };
  const legacy = s as unknown as { current_period_start?: number; current_period_end?: number };
  const start = item?.current_period_start ?? legacy.current_period_start;
  const end = item?.current_period_end ?? legacy.current_period_end;
  const { error } = await sb.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: typeof s.customer === 'string' ? s.customer : s.customer.id,
    stripe_subscription_id: s.id,
    status: s.status,
    cancel_at_period_end: !!s.cancel_at_period_end,
    current_period_start: start ? new Date(start * 1000).toISOString() : null,
    current_period_end: end ? new Date(end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`falha ao gravar assinatura: ${error.message}`);
  return s;
}
