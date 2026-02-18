import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { logAuditEvent } from '@/lib/audit';

export const runtime = 'nodejs';

// POST - invite a member
export async function POST(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { email, role } = await request.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  // Must own a team
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', gate.userId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'You must create a team first' }, { status: 400 });
  }

  // Check seat limit (10 seats including owner)
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', team.id)
    .neq('status', 'removed');

  if ((count ?? 0) >= 9) {
    return NextResponse.json({ error: 'Team is at maximum capacity (10 seats including owner)' }, { status: 403 });
  }

  // Check if already invited
  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id, status')
    .eq('team_id', team.id)
    .eq('email', email.toLowerCase())
    .single();

  if (existingMember && existingMember.status !== 'removed') {
    return NextResponse.json({ error: 'This person is already on the team or has a pending invite' }, { status: 400 });
  }

  if (existingMember && existingMember.status === 'removed') {
    // Re-invite a previously removed member
    const { data, error } = await supabase
      .from('team_members')
      .update({ status: 'pending', role: role || 'viewer', invited_at: new Date().toISOString() })
      .eq('id', existingMember.id)
      .select('id, email, role, status, invited_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAuditEvent(gate.userId, 'team.invite', `Re-invited ${email} to team`);
    return NextResponse.json({ member: data });
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      email: email.toLowerCase(),
      role: role || 'viewer',
      status: 'pending',
      invited_at: new Date().toISOString(),
    })
    .select('id, email, role, status, invited_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'team.invite', `Invited ${email} to team as ${role || 'viewer'}`);
  return NextResponse.json({ member: data });
}

// DELETE - remove a member
export async function DELETE(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { memberId } = await request.json();

  // Must own the team
  const { data: team } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', gate.userId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('id, email')
    .eq('id', memberId)
    .eq('team_id', team.id)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('team_members')
    .update({ status: 'removed' })
    .eq('id', memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'team.remove', `Removed ${member.email} from team`);
  return NextResponse.json({ success: true });
}
