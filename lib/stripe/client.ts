import Stripe from 'stripe';

export const isLiveMode = process.env.VERCEL_ENV === 'production';

function getStripeKey(): string {
  const testKey = process.env.STRIPE_TEST_SECRET_KEY;
  const liveKey = process.env.STRIPE_SECRET_KEY;

  if (isLiveMode) {
    console.log('[Stripe] Production mode, using live key');
    return liveKey!;
  }

  if (testKey) {
    console.log('[Stripe] Non-production mode, using test key');
    return testKey;
  }

  console.log('[Stripe] Non-production mode, no test key found, falling back to live key');
  return liveKey!;
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = getStripeKey();
    console.log('[Stripe] Initializing client, key prefix:', key?.substring(0, 8) || 'MISSING');
    _stripe = new Stripe(key, {
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
