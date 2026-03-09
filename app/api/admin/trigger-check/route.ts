import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchWithRetry, extractEffectiveDate } from '@/lib/fetcher';
import { hashContent, hasChanged, getBasicDiff, getRemovalRatio } from '@/lib/differ';
import { analyzeChanges } from '@/lib/analyzer';
import { sendChangeAlert, notifyAdminPendingReview } from '@/lib/notifier';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { deliverWebhooks } from '@/lib/webhooks/deliver';
import { deliverSlackNotifications } from '@/lib/webhooks/slack';
import { logScanFailure, wasPreviousScanFailure } from '@/lib/scan-failures';
import { requireAdmin } from '@/lib/api-auth';
import { isSpaDocument } from '@/lib/spa-documents';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for checking all docs

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

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) return admin.response;
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
      // --- SPA document guard: skip known JS-rendered pages ---
      if (isSpaDocument(doc.url)) {
        await logScanFailure({
          documentId: doc.id,
          vendorId: doc.vendor_id,
          url: doc.url,
          failure: {
            ok: false,
            reason: 'spa_not_supported',
            httpStatus: null,
            contentLength: null,
            errorMessage: `Skipped: ${doc.url} is a known SPA/JS-rendered page`,
          },
        });
        // Still update last_checked_at so diagnostics show accurate scan times
        await supabase
          .from('documents')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', doc.id);
        results.push({
          document: displayName,
          status: 'spa_not_supported',
        });
        continue;
      }

      // --- Safeguard 5: Fetch with retry (up to 3 attempts, 5s delay) ---
      const fetchResult = await fetchWithRetry(doc.url);

      // --- Safeguard 1 & 2: HTTP status check + content length floor ---
      if (!fetchResult.ok) {
        console.warn(`[trigger-check] Fetch failed for "${displayName}" after retries: ${fetchResult.reason} — ${fetchResult.errorMessage}`);
        await logScanFailure({
          documentId: doc.id,
          vendorId: doc.vendor_id,
          url: doc.url,
          failure: fetchResult,
        });
        // Update last_checked_at even on failure for accurate diagnostic timestamps
        await supabase
          .from('documents')
          .update({ last_checked_at: new Date().toISOString() })
          .eq('id', doc.id);
        results.push({
          document: displayName,
          status: 'fetch_failed',
          reason: fetchResult.reason,
          httpStatus: fetchResult.httpStatus,
          contentLength: fetchResult.contentLength,
        });
        continue;
      }

      const content = fetchResult.content;
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

      // --- Safeguard 4a: First scan — save baseline, no comparison ---
      if (!lastSnapshot) {
        await supabase
          .from('snapshots')
          .insert({
            vendor_id: doc.vendor_id,
            document_id: doc.id,
            content_hash: contentHash,
            content,
          });
        results.push({ document: displayName, status: 'initial_snapshot' });
        continue;
      }

      // No change detected
      if (!hasChanged(lastSnapshot.content_hash, contentHash)) {
        results.push({ document: displayName, status: 'no_change' });
        continue;
      }

      // --- Safeguard 4b: Don't alert if previous scan was a failed fetch ---
      if (await wasPreviousScanFailure(doc.id, lastSnapshot.fetched_at)) {
        console.log(`[trigger-check] Recovery baseline for "${displayName}" — previous scan was a failure, saving new baseline without alerting`);
        await supabase
          .from('snapshots')
          .insert({
            vendor_id: doc.vendor_id,
            document_id: doc.id,
            content_hash: contentHash,
            content,
          });
        await supabase
          .from('documents')
          .update({ last_changed_at: new Date().toISOString() })
          .eq('id', doc.id);
        results.push({ document: displayName, status: 'recovery_baseline' });
        continue;
      }

      // Stale baseline guard: if last snapshot is very old (>30 days),
      // the document was likely inactive/reactivated. Treat as baseline reset.
      const lastFetchedAt = new Date(lastSnapshot.fetched_at);
      const daysSinceLastFetch = (Date.now() - lastFetchedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceLastFetch > 30) {
        console.log(`[trigger-check] Stale baseline reset for "${displayName}" — last snapshot was ${Math.round(daysSinceLastFetch)} days old`);
        await supabase
          .from('snapshots')
          .insert({
            vendor_id: doc.vendor_id,
            document_id: doc.id,
            content_hash: contentHash,
            content,
          });
        await supabase
          .from('documents')
          .update({ last_changed_at: new Date().toISOString() })
          .eq('id', doc.id);
        results.push({ document: displayName, status: 'stale_baseline_reset', daysSince: Math.round(daysSinceLastFetch) });
        continue;
      }

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

      if (!newSnapshot) {
        results.push({ document: displayName, status: 'error', error: 'Failed to save new snapshot' });
        continue;
      }

      // --- Safeguard 4c: First comparison guard ---
      const { count: priorChangeCount } = await supabase
        .from('changes')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', doc.id);

      const isFirstComparison = (priorChangeCount ?? 0) === 0;

      const diff = getBasicDiff(lastSnapshot.content, content);

      // Safety Net 2 (existing): Full-document replacement detection
      const splitSentences = (text: string) =>
        text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
      const oldSentenceCount = splitSentences(lastSnapshot.content).length;
      const newSentenceCount = splitSentences(content).length;
      const totalSentences = Math.max(oldSentenceCount, newSentenceCount);
      const changedSentences = diff.added.length + diff.removed.length;
      const changeRatio = totalSentences > 0 ? changedSentences / totalSentences : 0;

      if (changeRatio > 0.8 && changedSentences > 100) {
        console.log(`[trigger-check] Full replacement detected for "${displayName}" — ${changedSentences} sentences changed (${Math.round(changeRatio * 100)}%). Saving baseline, skipping analysis.`);

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
            pending_review: false,
          });

        await supabase
          .from('documents')
          .update({ last_changed_at: new Date().toISOString() })
          .eq('id', doc.id);

        results.push({ document: displayName, status: 'full_replacement_baseline', changeRatio: Math.round(changeRatio * 100) });
        continue;
      }

      // --- Safeguard 3: 90% removal sanity check ---
      const removalRatio = getRemovalRatio(lastSnapshot.content, content);

      if (removalRatio > 0.9) {
        console.log(`[trigger-check] Massive removal detected for "${displayName}" — ${Math.round(removalRatio * 100)}% of previous content removed. Holding for manual review.`);

        const { data: pendingChange } = await supabase
          .from('changes')
          .insert({
            vendor_id: doc.vendor_id,
            document_id: doc.id,
            old_snapshot_id: lastSnapshot.id,
            new_snapshot_id: newSnapshot.id,
            summary: `${Math.round(removalRatio * 100)}% of document content was removed. Held for manual review — possible failed fetch or page change.`,
            risk_level: 'high',
            risk_bucket: null,
            risk_priority: 'high',
            categories: [],
            is_noise: false,
            pending_review: true,
          })
          .select()
          .single();

        await supabase
          .from('documents')
          .update({ last_changed_at: new Date().toISOString() })
          .eq('id', doc.id);

        if (pendingChange) {
          await notifyAdminPendingReview({
            displayName,
            documentUrl: doc.url,
            removalRatio,
            changeId: pendingChange.id,
          });
        }

        results.push({ document: displayName, status: 'pending_review', removalRatio: Math.round(removalRatio * 100) });
        continue;
      }

      // Normal incremental change — run AI analysis
      const effectiveDate = extractEffectiveDate(content);
      const analysis = await analyzeChanges(displayName, diff.added, diff.removed, effectiveDate);

      // Safety Net 3 (existing): For noise changes, force risk_level to 'low'
      const isNoise = analysis.isNoise ?? false;
      const effectiveRiskLevel = isNoise ? 'low' : analysis.riskLevel;

      // First-scan noise suppression
      if (isFirstComparison && (isNoise || effectiveRiskLevel === 'low')) {
        console.log(`[trigger-check] First-scan calibration for "${displayName}" — ${effectiveRiskLevel} change suppressed`);
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
        pending_review: false,
      };

      // Try with analysis_failed column; fall back without it if column doesn't exist yet
      let changeRecord;
      const { data: d1, error: e1 } = await supabase
        .from('changes')
        .insert({ ...changePayload, analysis_failed: analysis.analysisFailed })
        .select()
        .single();

      if (e1 && e1.message.includes('analysis_failed')) {
        console.warn(`[trigger-check] analysis_failed column not found — inserting without it`);
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
            console.error('[trigger-check] Webhook/Slack delivery error:', err);
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
    } catch (err) {
      results.push({
        document: displayName,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ checked: results.length, results });
}
