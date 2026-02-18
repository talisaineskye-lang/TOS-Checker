import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';

export const runtime = 'nodejs';

// POST - accept an invite (called by the invited user)
export async function POST() {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    // Also allow pro users to accept invites (they get business access via team)
    // For now, require at least auth
    return NextResponse.json(gate.body, { status: gate.status });
  }

  // Look up the user's email
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email')
    .eq('id', gate.userId)
    .single();

  if (!profile?.email) {
    return NextResponse.json({ error: 'Could not determine your email' }, { status: 400 });
  }

  // Find pending invite for this email
  const { data: invite } = await supabase
    .from('team_members')
    .select('id, team_id')
    .eq('email', profile.email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'No pending invite found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('team_members')
    .update({
      user_id: gate.userId,
      status: 'active',
      joined_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, teamId: invite.team_id });
}
