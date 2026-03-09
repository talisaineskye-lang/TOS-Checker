import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      return NextResponse.redirect('https://stackdrift.gumroad.com/l/liddai');
    }

    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  } catch {
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }
}
