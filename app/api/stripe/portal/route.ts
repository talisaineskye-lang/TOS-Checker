import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import { rateLimit } from '@/lib/rate-limit';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const { success } = rateLimit(`portal:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${request.headers.get('origin')}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
