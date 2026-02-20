import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchTosContent, extractEffectiveDate } from '@/lib/fetcher';
import { hashContent, hasChanged, getBasicDiff } from '@/lib/differ';
import { analyzeChanges } from '@/lib/analyzer';
import { sendChangeAlert } from '@/lib/notifier';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { updateScannerIntelItems } from '@/lib/intel/store';
import { deliverWebhooks } from '@/lib/webhooks/deliver';
import { deliverSlackNotifications } from '@/lib/webhooks/slack';

export const runtime = 'nodejs';

interface DocumentWithVendor {
  id: string;
  vendor_id: string;
  doc_type: DocumentType;
  url: string;
  is_active: boolean;
  vendors: {
    id: string;
    name: string;
    is_active: boolean;
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all active documents with their vendor info
  const { data: documents, error } = await supabase
    .from('documents')
    .select('*, vendors!inner(id, name, is_active)')
    .eq('is_active', true)
    .eq('vendors.is_active', true);

  if (error || !documents) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const doc of documents as DocumentWithVendor[]) {
    const vendorName = doc.vendors.name;
    const docTypeLabel = DOCUMENT_TYPE_LABELS[doc.doc_type] || doc.doc_type;
    const displayName = `${vendorName} - ${docTypeLabel}`;

    try {
      const content = await fetchTosContent(doc.url);

      // Safety Net 1: Empty/tiny content protection — if fetch returned
      // garbage (blocked, error page, empty), skip entirely to avoid
      // poisoning the baseline or creating false "content removed" alerts
      if (content.length < 200) {
        console.warn(`[check-tos] Skipping "${displayName}" — fetched content too small (${content.length} chars), likely a failed fetch or blocked request`);
        results.push({ document: displayName, status: 'fetch_empty', contentLength: content.length });
        continue;
      }

      const contentHash = hashContent(content);

      // Get last snapshot for this document
      const { data: lastSnapshot } = await supabase
        .from('snapshots')
        .select('*')
        .eq('document_id', doc.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      // Update last checked timestamp on document
      await supabase
        .from('documents')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', doc.id);

      if (!lastSnapshot || hasChanged(lastSnapshot.content_hash, contentHash)) {
        // Save new snapshot
        const { data: newSnapshot } = await supabase
          .from('snapshots')
          .insert({
            vendor_id: doc.vendor_id,
            document_id: doc.id,
            content_hash: contentHash,
            content,
          })
          .select()
          .single();

        if (lastSnapshot && newSnapshot) {
          // First-scan guard: check if this document has any prior change records
          const { count: priorChangeCount } = await supabase
            .from('changes')
            .select('*', { count: 'exact', head: true })
            .eq('document_id', doc.id);

          const isFirstComparison = (priorChangeCount ?? 0) === 0;

          // Stale baseline guard: if last snapshot is very old (>30 days),
          // the document was likely inactive/reactivated. Treat as baseline reset.
          const lastFetchedAt = new Date(lastSnapshot.fetched_at);
          const daysSinceLastFetch = (Date.now() - lastFetchedAt.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceLastFetch > 30) {
            console.log(`[check-tos] Stale baseline reset for "${displayName}" — last snapshot was ${Math.round(daysSinceLastFetch)} days old`);
            await supabase
              .from('documents')
              .update({ last_changed_at: new Date().toISOString() })
              .eq('id', doc.id);
            results.push({ document: displayName, status: 'stale_baseline_reset', daysSince: Math.round(daysSinceLastFetch) });
            continue;
          }

          const diff = getBasicDiff(lastSnapshot.content, content);

          // Safety Net 2: Full-document replacement detection — if 80%+ of
          // sentences changed, this is a language swap, page redesign, or fetch
          // anomaly. Save the new baseline but skip AI analysis to save costs.
          const splitSentences = (text: string) =>
            text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
          const oldSentenceCount = splitSentences(lastSnapshot.content).length;
          const newSentenceCount = splitSentences(content).length;
          const totalSentences = Math.max(oldSentenceCount, newSentenceCount);
          const changedSentences = diff.added.length + diff.removed.length;
          const changeRatio = totalSentences > 0 ? changedSentences / totalSentences : 0;

          if (changeRatio > 0.8 && changedSentences > 100) {
            console.log(`[check-tos] Full replacement detected for "${displayName}" — ${changedSentences} sentences changed (${Math.round(changeRatio * 100)}%). Saving baseline, skipping analysis.`);

            await supabase
              .from('changes')
              .insert({
                vendor_id: doc.vendor_id,
                document_id: doc.id,
                old_snapshot_id: lastSnapshot.id,
                new_snapshot_id: newSnapshot.id,
                summary: 'Large-scale content change detected (likely page restructure or language change). New baseline saved.',
                risk_level: 'low',
                risk_bucket: null,
                risk_priority: 'low',
                categories: [],
                is_noise: true,
              });

            await supabase
              .from('documents')
              .update({ last_changed_at: new Date().toISOString() })
              .eq('id', doc.id);

            results.push({ document: displayName, status: 'full_replacement_baseline', changeRatio: Math.round(changeRatio * 100) });
          } else {
            // Normal incremental change — run AI analysis
            const effectiveDate = extractEffectiveDate(content);
            const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

            // Safety Net 3: For noise changes, force risk_level to 'low'
            const isNoise = analysis.isNoise ?? false;
            const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;

            // First-scan noise suppression: on first-ever comparison,
            // auto-silence noise/low changes from dynamic page content
            if (isFirstComparison && (isNoise || effectiveRiskLevel === 'low')) {
              console.log(`[check-tos] First-scan calibration for "${displayName}" — ${effectiveRiskLevel} change suppressed`);
              await supabase
                .from('documents')
                .update({ last_changed_at: new Date().toISOString() })
                .eq('id', doc.id);
              results.push({ document: displayName, status: 'first_scan_calibration', riskLevel: effectiveRiskLevel });
              continue;
            }

            const changePayload = {
              vendor_id: doc.vendor_id,
              document_id: doc.id,
              old_snapshot_id: lastSnapshot.id,
              new_snapshot_id: newSnapshot.id,
              summary: analysis.summary,
              impact: analysis.impact,
              action: analysis.action,
              risk_level: effectiveRiskLevel,
              risk_bucket: analysis.riskBucket,
              risk_priority: isNoise ? 'low' : analysis.riskPriority,
              categories: analysis.categories,
              is_noise: isNoise,
            };

            // Try with analysis_failed column; fall back without it if column doesn't exist yet
            let changeRecord;
            const { data: d1, error: e1 } = await supabase
              .from('changes')
              .insert({ ...changePayload, analysis_failed: analysis.analysisFailed })
              .select()
              .single();

            if (e1 && e1.message.includes('analysis_failed')) {
              console.warn(`[check-tos] analysis_failed column not found — inserting without it`);
              const { data: d2 } = await supabase
                .from('changes')
                .insert(changePayload)
                .select()
                .single();
              changeRecord = d2;
            } else {
              changeRecord = d1;
            }

            // Send alert for medium/high risk changes — skip noise
            if (effectiveRiskLevel !== 'low' && !isNoise) {
              await sendChangeAlert({
                serviceName: displayName,
                docType: docTypeLabel,
                summary: analysis.summary,
                impact: analysis.impact || undefined,
                action: analysis.action || undefined,
                riskLevel: effectiveRiskLevel,
                categories: analysis.categories,
                detectedAt: new Date(),
                vendorId: doc.vendor_id,
                changeId: changeRecord?.id,
              });

              if (changeRecord?.id) {
                await supabase
                  .from('changes')
                  .update({ notified: true })
                  .eq('id', changeRecord.id);

                // Deliver webhooks and Slack notifications
                const webhookData = {
                  changeId: changeRecord.id,
                  vendorId: doc.vendor_id,
                  vendorName,
                  documentType: docTypeLabel,
                  severity: effectiveRiskLevel,
                  summary: analysis.summary,
                  impact: analysis.impact || '',
                  action: analysis.action || '',
                  tags: analysis.categories,
                };

                try {
                  await Promise.allSettled([
                    deliverWebhooks(webhookData),
                    deliverSlackNotifications(webhookData),
                  ]);
                } catch (err) {
                  console.error('[check-tos] Webhook/Slack delivery error:', err);
                }
              }
            }

            // Update last changed timestamp on document
            await supabase
              .from('documents')
              .update({ last_changed_at: new Date().toISOString() })
              .eq('id', doc.id);

            results.push({
              document: displayName,
              status: analysis.analysisFailed ? 'analysis_failed' : (isNoise ? 'noise' : 'changed'),
              riskLevel: effectiveRiskLevel,
            });
          }
        } else {
          results.push({ document: displayName, status: 'initial_snapshot' });
        }
      } else {
        results.push({ document: displayName, status: 'no_change' });
      }
    } catch (err) {
      results.push({
        document: displayName,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // Update scanner intel items if any changes were detected this cycle
  const hasChanges = results.some((r) => r.status === 'changed');
  if (hasChanges) {
    try {
      await updateScannerIntelItems();
    } catch (err) {
      console.error('[check-tos] Failed to update scanner intel items:', err);
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
