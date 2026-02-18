import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { getBasicDiff } from '@/lib/differ';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const changeId = new URL(request.url).searchParams.get('id');
  if (!changeId) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data: change } = await supabase
    .from('changes')
    .select('old_snapshot_id, new_snapshot_id')
    .eq('id', changeId)
    .single();

  if (!change) {
    return NextResponse.json({ error: 'Change not found' }, { status: 404 });
  }

  const [{ data: oldSnap }, { data: newSnap }] = await Promise.all([
    supabase.from('snapshots').select('content').eq('id', change.old_snapshot_id).single(),
    supabase.from('snapshots').select('content').eq('id', change.new_snapshot_id).single(),
  ]);

  if (!oldSnap || !newSnap) {
    return NextResponse.json({ error: 'Snapshots not found' }, { status: 404 });
  }

  const diff = getBasicDiff(oldSnap.content, newSnap.content);

  return NextResponse.json({
    added: diff.added,
    removed: diff.removed,
  });
}
