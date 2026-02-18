import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Cancel Stripe subscription and delete customer
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profile?.stripe_customer_id) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: 'active',
      });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
      await stripe.customers.del(profile.stripe_customer_id);
    } catch (err) {
      console.error('Stripe cleanup error:', err);
    }
  }

  // 2. Delete user data from database
  try {
    await supabaseAdmin
      .from('user_vendors')
      .delete()
      .eq('user_id', user.id);
  } catch (err) {
    console.error('user_vendors cleanup error:', err);
  }

  try {
    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', user.id);
  } catch (err) {
    console.error('user_profiles cleanup error:', err);
  }

  // 3. Delete auth user
  try {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  } catch (err) {
    console.error('Auth user deletion error:', err);
  }

  return NextResponse.json({ success: true });
}
