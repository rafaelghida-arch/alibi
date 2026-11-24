import Stripe from 'stripe';

let client: Stripe | null = null;
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY ausente');
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
export const siteUrl = (req: Request) => process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
