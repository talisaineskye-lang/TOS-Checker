import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import { planFromPriceId } from '@/lib/stripe/prices';
import type Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updatePlan(customerId: string, plan: string) {
  await supabaseAdmin
    .from('user_profiles')
    .update({ plan })
    .eq('stripe_customer_id', customerId);
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      // Handled by subscription.created
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      if (sub.status === 'active' || sub.status === 'trialing') {
        const priceId = sub.items.data[0]?.price?.id;
        const plan = priceId ? planFromPriceId(priceId) : null;
        if (plan) {
          await updatePlan(customerId, plan);
        }
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        await updatePlan(customerId, 'free');
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await updatePlan(customerId, 'free');
      break;
    }

    case 'invoice.payment_failed': {
      // Could send a notification here in the future
      break;
    }
  }

  return NextResponse.json({ received: true });
}
