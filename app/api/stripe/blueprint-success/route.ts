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
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
    }

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(FILE, SIGNED_URL_EXPIRY);

    if (error || !data?.signedUrl) {
      return NextResponse.redirect(new URL('/blueprint?error=download_failed', request.url));
    }

    const downloadUrl = new URL('/blueprint/download', request.url);
    downloadUrl.searchParams.set('url', data.signedUrl);
    return NextResponse.redirect(downloadUrl.toString());
  } catch {
    return NextResponse.redirect(new URL('/blueprint?error=payment_failed', request.url));
  }
}
