import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { BLUEPRINT_PRICE_ID } from '@/lib/stripe/prices';

export async function POST(request: Request) {
  if (!BLUEPRINT_PRICE_ID) {
    return NextResponse.json({ error: 'Blueprint price not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const origin = request.headers.get('origin') || 'https://www.stackdrift.app';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: BLUEPRINT_PRICE_ID, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/api/stripe/blueprint-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/blueprint`,
  });

  return NextResponse.json({ url: session.url });
}
