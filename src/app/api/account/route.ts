import { NextResponse } from 'next/server';
import { accountFor, userFromRequest, PRICE_CENTS } from '@/lib/server';
import { stripeConfigured } from '@/lib/stripe';

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  const acc = await accountFor(user);
  return NextResponse.json({ ...acc, email: user?.email ?? null, priceCents: PRICE_CENTS(), billing: stripeConfigured() });
}
