import Stripe from 'stripe';

export const isLiveMode = process.env.VERCEL_ENV === 'production';

function getStripeKey(): string {
  if (isLiveMode) {
    return process.env.STRIPE_SECRET_KEY!;
  }
  return process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY!;
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeKey(), {
      apiVersion: '2026-01-28.clover',
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop];
  },
});
