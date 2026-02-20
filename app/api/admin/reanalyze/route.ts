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

  console.log(`[reanalyze] Starting reanalysis for change: ${changeId}`);

  // Fetch the change record with its snapshots
  const { data: change, error: changeError } = await supabase
    .from('changes')
    .select('*, vendors(name), documents(doc_type)')
    .eq('id', changeId)
    .single();

  if (changeError || !change) {
    console.error(`[reanalyze] Change not found: ${changeId}`, changeError?.message);
    return NextResponse.json({ error: 'Change not found' }, { status: 404 });
  }

  console.log(`[reanalyze] Fetched change record: ${changeId}`, {
    vendor: change.vendors?.name,
    oldSnapshotId: change.old_snapshot_id,
    newSnapshotId: change.new_snapshot_id,
  });

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
    console.error(`[reanalyze] Snapshots not found for change ${changeId}:`, {
      oldSnapFound: !!oldSnap,
      newSnapFound: !!newSnap,
      oldSnapshotId: change.old_snapshot_id,
      newSnapshotId: change.new_snapshot_id,
    });
    return NextResponse.json({ error: 'Snapshots not found' }, { status: 404 });
  }

  // Guard against null/empty snapshot content
  if (!oldSnap.content || !newSnap.content) {
    console.error(`[reanalyze] Snapshot content is null/empty for change ${changeId}:`, {
      oldContentLength: oldSnap.content?.length ?? 'NULL',
      newContentLength: newSnap.content?.length ?? 'NULL',
    });
    return NextResponse.json({ error: 'Snapshot content is empty — cannot re-analyze' }, { status: 422 });
  }

  // Re-diff and re-analyze
  const vendorName = change.vendors?.name || 'Unknown';
  const docTypeLabel = DOCUMENT_TYPE_LABELS[change.documents?.doc_type as DocumentType] || 'Terms of Service';
  const displayName = `${vendorName} - ${docTypeLabel}`;

  const diff = getBasicDiff(oldSnap.content, newSnap.content);

  console.log(`[reanalyze] Diff for ${changeId}:`, {
    addedSentences: diff.added.length,
    removedSentences: diff.removed.length,
    addedChars: diff.added.join('').length,
    removedChars: diff.removed.join('').length,
  });

  if (diff.added.length === 0 && diff.removed.length === 0) {
    console.warn(`[reanalyze] Empty diff for ${changeId} — snapshots may be identical`);
    return NextResponse.json({ error: 'No differences found between snapshots — nothing to analyze' }, { status: 422 });
  }

  console.log(`[reanalyze] Sending to Sonnet for "${displayName}"...`);
  const effectiveDate = extractEffectiveDate(newSnap.content);
  const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

  console.log(`[reanalyze] Sonnet response for ${changeId}:`, JSON.stringify({
    summary: analysis.summary,
    impact: analysis.impact,
    action: analysis.action,
    riskLevel: analysis.riskLevel,
    analysisFailed: analysis.analysisFailed,
  }));

  // Build update payload — only include analysis_failed if the column exists
  const updatePayload: Record<string, unknown> = {
    summary: analysis.summary,
    impact: analysis.impact,
    action: analysis.action,
    risk_level: analysis.riskLevel,
    risk_bucket: analysis.riskBucket,
    risk_priority: analysis.riskPriority,
    categories: analysis.categories,
    is_noise: analysis.isNoise,
  };

  // Try with analysis_failed first; if column doesn't exist yet, retry without it
  console.log(`[reanalyze] Saving to database for ${changeId}...`);

  let updateError;
  const { error: err1 } = await supabase
    .from('changes')
    .update({ ...updatePayload, analysis_failed: analysis.analysisFailed })
    .eq('id', changeId);

  if (err1 && err1.message.includes('analysis_failed')) {
    console.warn(`[reanalyze] analysis_failed column not found — retrying without it`);
    const { error: err2 } = await supabase
      .from('changes')
      .update(updatePayload)
      .eq('id', changeId);
    updateError = err2;
  } else {
    updateError = err1;
  }

  if (updateError) {
    console.error(`[reanalyze] Database update failed for ${changeId}:`, updateError.message);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Verify the update actually wrote
  const { data: verify } = await supabase
    .from('changes')
    .select('summary, impact, action, risk_level')
    .eq('id', changeId)
    .single();

  console.log(`[reanalyze] Verification read for ${changeId}:`, JSON.stringify(verify));

  return NextResponse.json({
    success: true,
    summary: analysis.summary,
    impact: analysis.impact,
    action: analysis.action,
    riskLevel: analysis.riskLevel,
    riskPriority: analysis.riskPriority,
  });
}
