import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getBasicDiff } from '@/lib/differ';
import { extractEffectiveDate } from '@/lib/fetcher';
import { analyzeChanges } from '@/lib/analyzer';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { changeId } = await request.json();

  if (!changeId) {
    return NextResponse.json({ error: 'changeId is required' }, { status: 400 });
  }

  // Fetch the change record with its snapshots
  const { data: change, error: changeError } = await supabase
    .from('changes')
    .select('*, vendors(name), documents(doc_type)')
    .eq('id', changeId)
    .single();

  if (changeError || !change) {
    return NextResponse.json({ error: 'Change not found' }, { status: 404 });
  }

  // Get old and new snapshots
  const { data: oldSnap } = await supabase
    .from('snapshots')
    .select('content')
    .eq('id', change.old_snapshot_id)
    .single();

  const { data: newSnap } = await supabase
    .from('snapshots')
    .select('content')
    .eq('id', change.new_snapshot_id)
    .single();

  if (!oldSnap || !newSnap) {
    return NextResponse.json({ error: 'Snapshots not found' }, { status: 404 });
  }

  // Re-diff and re-analyze
  const vendorName = change.vendors?.name || 'Unknown';
  const docTypeLabel = DOCUMENT_TYPE_LABELS[change.documents?.doc_type as DocumentType] || 'Terms of Service';
  const displayName = `${vendorName} - ${docTypeLabel}`;

  const diff = getBasicDiff(oldSnap.content, newSnap.content);
  const effectiveDate = extractEffectiveDate(newSnap.content);
  const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

  // Update the change record with all AI fields
  const { error: updateError } = await supabase
    .from('changes')
    .update({
      summary: analysis.summary,
      impact: analysis.impact,
      action: analysis.action,
      risk_level: analysis.riskLevel,
      risk_bucket: analysis.riskBucket,
      risk_priority: analysis.riskPriority,
      categories: analysis.categories,
      is_noise: analysis.isNoise,
    })
    .eq('id', changeId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    summary: analysis.summary,
    impact: analysis.impact,
    action: analysis.action,
    riskLevel: analysis.riskLevel,
    riskPriority: analysis.riskPriority,
  });
}
