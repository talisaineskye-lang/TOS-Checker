import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const ADMIN_EMAIL = 'talisaine.skye@gmail.com';

type AuthSuccess = { authorized: true; userId: string; email: string };
type AuthFailure = { authorized: false; response: NextResponse };

/**
 * Require an authenticated Supabase session.
 * Returns 401 if no valid session found.
 */
export async function requireAuth(): Promise<AuthSuccess | AuthFailure> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true, userId: user.id, email: user.email! };
}

/**
 * Require admin access (authenticated + admin email).
 * Returns 401 if not authenticated, 403 if not admin.
 */
export async function requireAdmin(): Promise<AuthSuccess | AuthFailure> {
  const auth = await requireAuth();
  if (!auth.authorized) return auth;

  if (auth.email !== ADMIN_EMAIL) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return auth;
}
