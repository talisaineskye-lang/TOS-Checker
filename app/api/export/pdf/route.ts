import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import { getBasicDiff } from '@/lib/differ';
import { logAuditEvent } from '@/lib/audit';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap<T>(val: T | T[] | null): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  tos: 'Terms of Service',
  privacy: 'Privacy Policy',
  aup: 'Acceptable Use Policy',
  pricing: 'Pricing',
  api_terms: 'API Terms',
  changelog: 'Changelog',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'CRITICAL',
  high: 'WARNING',
  medium: 'NOTICE',
  low: 'LOW',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2828',
  high: '#dca014',
  medium: '#3c78dc',
  low: '#646478',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function POST(request: NextRequest) {
  const gate = await requirePlan('business');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { changeIds } = await request.json();

  if (!Array.isArray(changeIds) || changeIds.length === 0) {
    return NextResponse.json({ error: 'changeIds array is required' }, { status: 400 });
  }

  if (changeIds.length > 50) {
    return NextResponse.json({ error: 'Maximum 50 changes per export' }, { status: 400 });
  }

  // Fetch all changes
  const { data: changes, error } = await supabase
    .from('changes')
    .select('id, summary, impact, action, risk_priority, detected_at, old_snapshot_id, new_snapshot_id, vendors(name), documents(doc_type, url)')
    .in('id', changeIds)
    .order('detected_at', { ascending: false });

  if (error || !changes || changes.length === 0) {
    return NextResponse.json({ error: 'Changes not found' }, { status: 404 });
  }

  // Fetch diffs for all changes
  const snapshotIds = new Set<string>();
  for (const c of changes) {
    if (c.old_snapshot_id) snapshotIds.add(c.old_snapshot_id);
    if (c.new_snapshot_id) snapshotIds.add(c.new_snapshot_id);
  }

  const { data: snapshots } = await supabase
    .from('snapshots')
    .select('id, content')
    .in('id', Array.from(snapshotIds));

  const snapshotMap = new Map<string, string>();
  for (const s of snapshots ?? []) {
    snapshotMap.set(s.id, s.content);
  }

  // Build PDF
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    bufferPages: true,
    info: {
      Title: `StackDrift Redline Report`,
      Author: 'StackDrift',
      Creator: 'StackDrift (stackdrift.app)',
    },
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));

  const isBatch = changes.length > 1;
  const hasTOC = changes.length >= 3;

  // ── Cover / Title page ──
  doc.fontSize(10).fillColor('#888888').text('CONFIDENTIAL — REDLINE REPORT', { align: 'center' });
  doc.moveDown(3);

  doc.fontSize(28).fillColor('#e8e8ed').text('StackDrift', { align: 'center' });
  doc.fontSize(12).fillColor('#4d8eff').text('Redline Change Report', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).fillColor('#888888').text(`Generated ${formatDate(new Date().toISOString())}`, { align: 'center' });
  doc.text(`${changes.length} change${changes.length !== 1 ? 's' : ''} included`, { align: 'center' });

  if (hasTOC) {
    // ── Table of Contents ──
    doc.addPage();
    doc.fontSize(18).fillColor('#e8e8ed').text('Table of Contents');
    doc.moveDown(0.5);
    drawLine(doc);
    doc.moveDown(0.5);

    changes.forEach((change, i) => {
      const v = unwrap(change.vendors);
      const d = unwrap(change.documents);
      const vendor = v?.name || 'Unknown';
      const docType = DOC_TYPE_LABELS[d?.doc_type || ''] || d?.doc_type || 'Document';
      const sev = SEVERITY_LABELS[change.risk_priority || 'low'] || 'LOW';
      doc.fontSize(10).fillColor('#cccccc')
        .text(`${i + 1}. [${sev}] ${vendor} — ${docType}  (${formatDate(change.detected_at)})`, {
          indent: 10,
        });
      doc.moveDown(0.3);
    });
  }

  // ── Render each change ──
  changes.forEach((change, i) => {
    doc.addPage();

    const v = unwrap(change.vendors);
    const d = unwrap(change.documents);
    const vendor = v?.name || 'Unknown';
    const docType = DOC_TYPE_LABELS[d?.doc_type || ''] || d?.doc_type || 'Document';
    const severity = change.risk_priority || 'low';
    const sevLabel = SEVERITY_LABELS[severity] || 'LOW';
    const sevColor = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;

    // Header bar
    if (isBatch) {
      doc.fontSize(9).fillColor('#666666').text(`Change ${i + 1} of ${changes.length}`, { align: 'right' });
      doc.moveUp(1);
    }

    doc.fontSize(9).fillColor('#888888').text('STACKDRIFT REDLINE REPORT');
    doc.moveDown(0.5);

    // Vendor + doc type
    doc.fontSize(18).fillColor('#e8e8ed').text(vendor);
    doc.fontSize(12).fillColor('#999999').text(docType);
    doc.moveDown(0.3);

    // Severity badge
    doc.fontSize(10)
      .fillColor(sevColor)
      .text(`● ${sevLabel}`, { continued: true })
      .fillColor('#666666')
      .text(`    ${formatDate(change.detected_at)}`);
    doc.moveDown(0.8);

    drawLine(doc);
    doc.moveDown(0.5);

    // Summary section
    if (change.summary) {
      doc.fontSize(11).fillColor('#4d8eff').text('Summary');
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#cccccc').text(change.summary, { lineGap: 2 });
      doc.moveDown(0.5);
    }

    // Impact
    if (change.impact) {
      doc.fontSize(11).fillColor('#4d8eff').text('Why It Matters');
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#cccccc').text(change.impact, { lineGap: 2 });
      doc.moveDown(0.5);
    }

    // Action
    if (change.action) {
      doc.fontSize(11).fillColor('#4d8eff').text('Recommended Action');
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor('#cccccc').text(change.action, { lineGap: 2 });
      doc.moveDown(0.5);
    }

    // Diff section
    const oldContent = change.old_snapshot_id ? snapshotMap.get(change.old_snapshot_id) : null;
    const newContent = change.new_snapshot_id ? snapshotMap.get(change.new_snapshot_id) : null;

    if (oldContent && newContent) {
      const diff = getBasicDiff(oldContent, newContent);

      if (diff.removed.length > 0 || diff.added.length > 0) {
        drawLine(doc);
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#e8e8ed').text('Redline Diff');
        doc.moveDown(0.5);

        // Removed lines (red, strikethrough)
        for (const line of diff.removed) {
          if (doc.y > 680) doc.addPage();
          doc.fontSize(9).fillColor('#b42828').text(`− ${line}`, {
            lineGap: 1,
            strike: true,
          });
        }

        if (diff.removed.length > 0 && diff.added.length > 0) {
          doc.moveDown(0.4);
        }

        // Added lines (green, underline)
        for (const line of diff.added) {
          if (doc.y > 680) doc.addPage();
          doc.fontSize(9).fillColor('#288c50').text(`+ ${line}`, {
            lineGap: 1,
            underline: true,
          });
        }
      }
    }

    // Footer
    const pageBottom = doc.page.height - doc.page.margins.bottom;
    doc.fontSize(8).fillColor('#555555')
      .text('stackdrift.app', doc.page.margins.left, pageBottom - 15, { align: 'center' });
  });

  doc.end();

  // Wait for PDF to finish generating
  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });

  await logAuditEvent(gate.userId, 'export.pdf', `Exported ${changes.length} change(s) as PDF`);

  const firstVendor = unwrap(changes[0].vendors);
  const filename = isBatch
    ? `stackdrift-redline-batch-${Date.now()}.pdf`
    : `stackdrift-redline-${firstVendor?.name?.toLowerCase().replace(/\s+/g, '-') || 'report'}-${Date.now()}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.length),
    },
  });
}

function drawLine(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc.strokeColor('#333333').lineWidth(0.5)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke();
}
