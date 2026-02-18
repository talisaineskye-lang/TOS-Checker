import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/lib/stripe/client';
import { planFromPriceId } from '@/lib/stripe/prices';
import type Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateProfile(customerId: string, fields: Record<string, unknown>) {
  const { error, count } = await supabaseAdmin
    .from('user_profiles')
    .update(fields)
    .eq('stripe_customer_id', customerId);
  console.log('UPDATE PROFILE:', { customerId, fields, error, count });
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

      console.log('WEBHOOK DEBUG:', {
        eventType: event.type,
        customerId,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        cancelAt: sub.cancel_at,
      });

      if (sub.status === 'active' || sub.status === 'trialing') {
        if (sub.cancel_at_period_end || sub.cancel_at) {
          // User cancelled — keep plan, record when it expires
          const cancelAt = sub.cancel_at
            ? new Date(sub.cancel_at * 1000).toISOString()
            : null;
          await updateProfile(customerId, { cancel_at: cancelAt });
        } else {
          // Active or resubscribed — set plan, clear cancel_at
          const priceId = sub.items.data[0]?.price?.id;
          const plan = priceId ? planFromPriceId(priceId) : null;
          if (plan) {
            await updateProfile(customerId, { plan, cancel_at: null });
          }
        }
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        await updateProfile(customerId, { plan: 'free', cancel_at: null });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await updateProfile(customerId, { plan: 'free', cancel_at: null });
      break;
    }

    case 'invoice.payment_failed': {
      // Could send a notification here in the future
      break;
    }
  }

  return NextResponse.json({ received: true });
}
