import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { logAuditEvent } from '@/lib/audit';
import crypto from 'crypto';

export const runtime = 'nodejs';

// GET - list user's API keys (masked)
export async function GET() {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { data } = await supabase
    .from('user_api_keys')
    .select('id, name, last_used_at, created_at')
    .eq('user_id', gate.userId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ keys: data ?? [] });
}

// POST - create a new API key
export async function POST(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { name } = await request.json();

  // Limit to 5 keys
  const { count } = await supabase
    .from('user_api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', gate.userId);

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 API keys allowed' }, { status: 403 });
  }

  // Generate key: sd_live_<random>
  const rawKey = `sd_live_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: gate.userId,
      key_hash: keyHash,
      name: name || 'Untitled key',
    })
    .select('id, name, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'apikey.create', `Created API key "${name || 'Untitled key'}"`);
  // Return the raw key only once — it cannot be retrieved later
  return NextResponse.json({ key: { ...data, rawKey } });
}

// DELETE - revoke an API key
export async function DELETE(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id } = await request.json();

  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('id', id)
    .eq('user_id', gate.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'apikey.revoke', `Revoked API key ${id}`);
  return NextResponse.json({ success: true });
}
