import Stripe from 'stripe';

let client: Stripe | null = null;
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY ausente');
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
/** Public address of the site. SITE_URL is read at runtime (Cloud Run); NEXT_PUBLIC_SITE_URL at build time (Vercel). */
export const siteUrl = (req: Request) => {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const u = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? u.host;
  const proto = req.headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
};
