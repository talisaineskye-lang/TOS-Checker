import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';

export const runtime = 'nodejs';

const PRESET_TAGS = [
  'GDPR Risk',
  'HIPAA Relevant',
  'SOC 2 Scope',
  'PCI DSS',
  'PIPEDA',
  'CCPA',
];

// GET — list all tags for the user/team, optionally filtered by vendor_id
export async function GET(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const vendorId = new URL(request.url).searchParams.get('vendor_id');

  // Determine team_id if user is on a team
  const teamId = await getTeamId(gate.userId);

  let query = supabase
    .from('vendor_tags')
    .select('id, vendor_id, tag_name, created_at')
    .order('created_at', { ascending: true });

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', gate.userId);
  }

  if (vendorId) {
    query = query.eq('vendor_id', vendorId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tags: data ?? [], presets: PRESET_TAGS });
}

// POST — add a tag to a vendor
export async function POST(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { vendor_id, tag_name } = await request.json();

  if (!vendor_id || !tag_name || typeof tag_name !== 'string') {
    return NextResponse.json({ error: 'vendor_id and tag_name are required' }, { status: 400 });
  }

  const cleanTag = tag_name.trim().slice(0, 30);
  if (!cleanTag) {
    return NextResponse.json({ error: 'Tag name cannot be empty' }, { status: 400 });
  }

  const teamId = await getTeamId(gate.userId);

  // Check for duplicate
  const matchQuery = supabase
    .from('vendor_tags')
    .select('id')
    .eq('vendor_id', vendor_id)
    .eq('tag_name', cleanTag);

  if (teamId) {
    matchQuery.eq('team_id', teamId);
  } else {
    matchQuery.eq('user_id', gate.userId);
  }

  const { data: existing } = await matchQuery.single();
  if (existing) {
    return NextResponse.json({ error: 'Tag already exists for this vendor' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vendor_tags')
    .insert({
      user_id: gate.userId,
      team_id: teamId || null,
      vendor_id,
      tag_name: cleanTag,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tag: data });
}

// DELETE — remove a tag
export async function DELETE(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id } = await request.json();

  const teamId = await getTeamId(gate.userId);

  const deleteQuery = supabase
    .from('vendor_tags')
    .delete()
    .eq('id', id);

  if (teamId) {
    deleteQuery.eq('team_id', teamId);
  } else {
    deleteQuery.eq('user_id', gate.userId);
  }

  const { error } = await deleteQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

async function getTeamId(userId: string): Promise<string | null> {
  // Check if user owns a team
  const { data: ownedTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (ownedTeam) return ownedTeam.id;

  // Check if member of a team
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return membership?.team_id || null;
}
