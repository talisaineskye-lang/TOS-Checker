import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/client';
import { getSupabase } from '@/lib/supabase';

const BUCKET = 'blueprint-downloads';
const FILE = 'vendor-watch-blueprint-v1.0.zip';
const SIGNED_URL_EXPIRY = 86400; // 24 hours

// Temporary debug flag — remove after testing
const DEBUG = process.env.VERCEL_ENV !== 'production';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    if (DEBUG) return NextResponse.json({ error: 'No session_id param' });
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }

  const debug: Record<string, unknown> = {
    sessionId,
    VERCEL_ENV: process.env.VERCEL_ENV || '(not set)',
    hasTestSecretKey: !!process.env.STRIPE_TEST_SECRET_KEY,
    hasLiveSecretKey: !!process.env.STRIPE_SECRET_KEY,
    hasTestPriceId: !!process.env.STRIPE_TEST_BLUEPRINT_PRICE_ID,
    hasLivePriceId: !!process.env.STRIPE_BLUEPRINT_PRICE_ID,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) || '(not set)',
    hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  try {
    const stripe = getStripe();
    debug.stripeKeyPrefix = (stripe as any)._api?.auth?.substring(0, 12) || 'unknown';

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    debug.sessionRetrieved = true;
    debug.paymentStatus = session.payment_status;
    debug.sessionStatus = session.status;

    if (session.payment_status !== 'paid') {
      debug.result = 'payment_not_completed';
      if (DEBUG) return NextResponse.json(debug);
      return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(FILE, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      debug.signedUrlError = error?.message || 'No signed URL returned';
      debug.result = 'download_failed';
      if (DEBUG) return NextResponse.json(debug);
      return NextResponse.redirect(new URL('/blueprint?error=download_failed', request.url));
    }

    debug.result = 'success';
    debug.signedUrlGenerated = true;

    if (DEBUG) return NextResponse.json(debug);

    const downloadUrl = new URL('/blueprint/download', request.url);
    downloadUrl.searchParams.set('url', data.signedUrl);
    return NextResponse.redirect(downloadUrl.toString());
  } catch (err: unknown) {
    debug.error = err instanceof Error ? err.message : String(err);
    debug.errorType = err instanceof Error ? err.constructor.name : typeof err;
    debug.result = 'exception';
    if (DEBUG) return NextResponse.json(debug, { status: 500 });
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }
}
