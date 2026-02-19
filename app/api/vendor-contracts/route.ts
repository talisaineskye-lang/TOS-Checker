import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { logAuditEvent } from '@/lib/audit';

export const runtime = 'nodejs';

/*
  Supabase table:

  CREATE TABLE vendor_contracts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    team_id uuid REFERENCES teams,
    vendor_id uuid REFERENCES vendors NOT NULL,
    contract_renewal_date date NOT NULL,
    notice_period_days integer NOT NULL DEFAULT 30,
    contract_value text,
    notes text,
    auto_renews boolean NOT NULL DEFAULT true,
    reminder_sent boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
  );
*/

// Helper: get team_id if user belongs to one
async function getTeamId(userId: string): Promise<string | null> {
  const { data: ownedTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('owner_id', userId)
    .single();
  if (ownedTeam) return ownedTeam.id;

  const { data: membership } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  return membership?.team_id ?? null;
}

// GET — list contracts for user/team
export async function GET() {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const teamId = await getTeamId(gate.userId);

  let query = supabase
    .from('vendor_contracts')
    .select('id, vendor_id, contract_renewal_date, notice_period_days, contract_value, notes, auto_renews, reminder_sent, created_at, vendors(name)')
    .order('contract_renewal_date', { ascending: true });

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', gate.userId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contracts: data ?? [] });
}

// POST — create or update a contract
export async function POST(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id, vendor_id, contract_renewal_date, notice_period_days, contract_value, notes, auto_renews } = await request.json();

  if (!vendor_id || !contract_renewal_date) {
    return NextResponse.json({ error: 'vendor_id and contract_renewal_date are required' }, { status: 400 });
  }

  const teamId = await getTeamId(gate.userId);

  if (id) {
    // Update existing
    const { data, error } = await supabase
      .from('vendor_contracts')
      .update({
        contract_renewal_date,
        notice_period_days: notice_period_days ?? 30,
        contract_value: contract_value || null,
        notes: notes || null,
        auto_renews: auto_renews ?? true,
        reminder_sent: false, // Reset on update
      })
      .eq('id', id)
      .select('id, vendor_id, contract_renewal_date, notice_period_days, contract_value, notes, auto_renews, reminder_sent, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ contract: data });
  }

  // Create new
  const { data, error } = await supabase
    .from('vendor_contracts')
    .insert({
      user_id: gate.userId,
      team_id: teamId,
      vendor_id,
      contract_renewal_date,
      notice_period_days: notice_period_days ?? 30,
      contract_value: contract_value || null,
      notes: notes || null,
      auto_renews: auto_renews ?? true,
    })
    .select('id, vendor_id, contract_renewal_date, notice_period_days, contract_value, notes, auto_renews, reminder_sent, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'settings.update', `Added renewal reminder for vendor ${vendor_id}`);
  return NextResponse.json({ contract: data });
}

// DELETE — remove a contract
export async function DELETE(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendor_contracts')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent(gate.userId, 'settings.update', `Removed renewal reminder ${id}`);
  return NextResponse.json({ success: true });
}
