import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchTosContent } from '@/lib/fetcher';
import { hashContent, hasChanged, getBasicDiff } from '@/lib/differ';
import { analyzeChanges } from '@/lib/analyzer';
import { sendChangeAlert } from '@/lib/notifier';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';

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
      const contentHash = hashContent(content);

      const { data: lastSnapshot } = await supabase
        .from('snapshots')
        .select('*')
        .eq('document_id', doc.id)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      await supabase
        .from('documents')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('id', doc.id);

      if (!lastSnapshot || hasChanged(lastSnapshot.content_hash, contentHash)) {
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
          const diff = getBasicDiff(lastSnapshot.content, content);
          const analysis = await analyzeChanges(displayName, diff.added, diff.removed);

          const { data: changeRecord } = await supabase
            .from('changes')
            .insert({
              vendor_id: doc.vendor_id,
              document_id: doc.id,
              old_snapshot_id: lastSnapshot.id,
              new_snapshot_id: newSnapshot.id,
              summary: analysis.summary,
              risk_level: analysis.riskLevel,
              risk_bucket: analysis.riskBucket,
              risk_priority: analysis.riskPriority,
              categories: analysis.categories,
            })
            .select()
            .single();

          if (analysis.riskLevel !== 'low') {
            await sendChangeAlert({
              serviceName: displayName,
              summary: analysis.summary,
              riskLevel: analysis.riskLevel,
              categories: analysis.categories,
              detectedAt: new Date(),
            });

            if (changeRecord?.id) {
              await supabase
                .from('changes')
                .update({ notified: true })
                .eq('id', changeRecord.id);
            }
          }

          await supabase
            .from('documents')
            .update({ last_changed_at: new Date().toISOString() })
            .eq('id', doc.id);

          results.push({
            document: displayName,
            status: 'changed',
            riskLevel: analysis.riskLevel,
          });
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

  return NextResponse.json({ checked: results.length, results });
}
