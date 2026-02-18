export type PlanTier = 'free' | 'solo' | 'pro' | 'business';

export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  solo: 1,
  pro: 2,
  business: 3,
};

export function hasAccess(userPlan: string, requiredPlan: string): boolean {
  const userLevel = PLAN_HIERARCHY[userPlan as PlanTier] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan as PlanTier] ?? 0;
  return userLevel >= requiredLevel;
}

export interface PlanLimits {
  customVendors: number;
  teamSeats: number;
  webhooks: number;
}

export function getPlanLimits(plan: string): PlanLimits {
  switch (plan as PlanTier) {
    case 'business':
      return { customVendors: Infinity, teamSeats: 10, webhooks: 10 };
    case 'pro':
      return { customVendors: 20, teamSeats: 1, webhooks: 3 };
    case 'solo':
      return { customVendors: 5, teamSeats: 1, webhooks: 0 };
    default:
      return { customVendors: 0, teamSeats: 1, webhooks: 0 };
  }
}
