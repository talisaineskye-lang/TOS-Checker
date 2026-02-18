import { createClient } from '@/lib/supabase/server';
import { hasAccess, type PlanTier } from './plan-gates';

/**
 * Server-side helper for API routes.
 * Returns the user's plan if they have access, or a 403 response payload.
 */
export async function requirePlan(requiredPlan: PlanTier): Promise<
  | { authorized: true; userId: string; plan: PlanTier }
  | { authorized: false; status: number; body: { error: string; requiredPlan: PlanTier } }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      body: { error: 'Authentication required', requiredPlan },
    };
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', user.id)
    .single();

  const userPlan = (profile?.plan || 'free') as PlanTier;

  if (!hasAccess(userPlan, requiredPlan)) {
    return {
      authorized: false,
      status: 403,
      body: {
        error: `Upgrade to ${requiredPlan} to access this feature`,
        requiredPlan,
      },
    };
  }

  return { authorized: true, userId: user.id, plan: userPlan };
}
