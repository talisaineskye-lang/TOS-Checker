'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { PlanName, Interval } from './prices';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function goToCheckout(plan: PlanName, interval: Interval) {
  const token = await getToken();
  if (!token) {
    window.location.href = '/onboarding';
    return;
  }

  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan, interval }),
  });

  const { url } = await res.json();
  if (url) window.location.href = url;
}

export async function goToPortal() {
  const token = await getToken();
  if (!token) {
    window.location.href = '/onboarding';
    return;
  }

  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { url } = await res.json();
  if (url) window.location.href = url;
}
