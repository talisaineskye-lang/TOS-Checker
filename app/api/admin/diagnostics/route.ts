import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-auth';
import { getSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;

  const results: Record<string, { ok: boolean; detail: string }> = {};

  // Test 1: Supabase service role key
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('vendors').select('id').limit(1);
    results.supabase_service_role = error
      ? { ok: false, detail: error.message }
      : { ok: true, detail: 'Connected' };
  } catch (err) {
    results.supabase_service_role = {
      ok: false,
      detail: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  // Test 2: ANTHROPIC_API_KEY present and non-empty
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    results.anthropic_key = { ok: false, detail: 'ANTHROPIC_API_KEY is not set' };
  } else if (!anthropicKey.startsWith('sk-ant-')) {
    results.anthropic_key = { ok: false, detail: `Key present but unexpected format (starts with: ${anthropicKey.slice(0, 8)}...)` };
  } else {
    results.anthropic_key = { ok: true, detail: `Present (${anthropicKey.slice(0, 16)}...)` };
  }

  // Test 3: External fetch (HN top stories - quick, no AI)
  try {
    const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(8000),
    });
    results.hn_fetch = res.ok
      ? { ok: true, detail: `HTTP ${res.status}` }
      : { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    results.hn_fetch = {
      ok: false,
      detail: err instanceof Error ? err.message : 'Fetch failed',
    };
  }

  // Test 4: CRON_SECRET present
  results.cron_secret = process.env.CRON_SECRET
    ? { ok: true, detail: 'Present' }
    : { ok: false, detail: 'CRON_SECRET is not set' };

  const allOk = Object.values(results).every((r) => r.ok);
  return NextResponse.json({ ok: allOk, results });
}
