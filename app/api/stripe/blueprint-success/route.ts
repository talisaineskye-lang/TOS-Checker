import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { getSupabase } from '@/lib/supabase';

const BUCKET = 'blueprint-downloads';
const FILE = 'vendor-watch-blueprint-v1.0.zip';
const SIGNED_URL_EXPIRY = 86400; // 24 hours

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }

  try {
    console.log('[blueprint-success] Verifying session:', sessionId);
    console.log('[blueprint-success] VERCEL_ENV:', process.env.VERCEL_ENV);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    console.log('[blueprint-success] Session retrieved:', {
      id: session.id,
      payment_status: session.payment_status,
      status: session.status,
    });

    if (session.payment_status !== 'paid') {
      console.log('[blueprint-success] Payment not completed, status:', session.payment_status);
      return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(FILE, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error);
      return NextResponse.redirect(new URL('/blueprint?error=download_failed', request.url));
    }

    const downloadUrl = new URL('/blueprint/download', request.url);
    downloadUrl.searchParams.set('url', data.signedUrl);

    return NextResponse.redirect(downloadUrl.toString());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const type = err instanceof Error ? err.constructor.name : typeof err;
    console.error('[blueprint-success] Error:', { type, message, err });
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }
}
