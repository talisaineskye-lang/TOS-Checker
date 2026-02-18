export const STRIPE_PRICES = {
  solo: {
    monthly: 'price_1T2GGEDXXJaDQ2FYKWYSqJ3U',
    annual: 'price_1T2GGCDXXJaDQ2FYrprT6tdp',
  },
  pro: {
    monthly: 'price_1T2GGFDXXJaDQ2FYr4qWVHZs',
    annual: 'price_1T2GGEDXXJaDQ2FYkYRip6Ep',
  },
  business: {
    monthly: 'price_1T2GGFDXXJaDQ2FY5MHVnIdm',
    annual: 'price_1T2GGFDXXJaDQ2FYi4pFsUcC',
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
