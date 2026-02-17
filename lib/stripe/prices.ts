export const STRIPE_PRICES = {
  solo: {
    monthly: 'price_1T1uRsDE0k8k5QDhjr8c4uZ8',
    annual: 'price_1T1uTTDE0k8k5QDhxWaE2Cop',
  },
  pro: {
    monthly: 'price_1T1uUrDE0k8k5QDhSE1AQdwr',
    annual: 'price_1T1uVTDE0k8k5QDhZLSTc6e6',
  },
  business: {
    monthly: 'price_1T1uWSDE0k8k5QDhyqXxazu4',
    annual: 'price_1T1uXWDE0k8k5QDhmB7PB9GN',
  },
} as const;

export type PlanName = keyof typeof STRIPE_PRICES;
export type Interval = 'monthly' | 'annual';

const priceIdToPlan = new Map<string, PlanName>();
for (const [plan, ids] of Object.entries(STRIPE_PRICES)) {
  priceIdToPlan.set(ids.monthly, plan as PlanName);
  priceIdToPlan.set(ids.annual, plan as PlanName);
}

export function planFromPriceId(priceId: string): PlanName | null {
  return priceIdToPlan.get(priceId) ?? null;
}
