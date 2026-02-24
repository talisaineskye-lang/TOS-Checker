import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendChangeAlert } from '@/lib/notifier';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/lib/types';
import { deliverWebhooks } from '@/lib/webhooks/deliver';
import { deliverSlackNotifications } from '@/lib/webhooks/slack';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const { changeId, action } = await request.json();

  if (!changeId || !action) {
    return NextResponse.json({ error: 'changeId and action are required' }, { status: 400 });
  }

  if (action !== 'approve' && action !== 'dismiss') {
    return NextResponse.json({ error: 'action must be "approve" or "dismiss"' }, { status: 400 });
  }

  // Fetch the change record
  const { data: change, error: changeError } = await supabase
    .from('changes')
    .select('*, vendors(name), documents(doc_type, url)')
    .eq('id', changeId)
    .eq('pending_review', true)
    .single();

  if (changeError || !change) {
    return NextResponse.json({ error: 'Pending review change not found' }, { status: 404 });
  }

  const vendorName = change.vendors?.name || 'Unknown';
  const docTypeLabel = DOCUMENT_TYPE_LABELS[change.documents?.doc_type as DocumentType] || 'Terms of Service';
  const displayName = `${vendorName} - ${docTypeLabel}`;

  if (action === 'dismiss') {
    // Dismiss: mark as noise, clear pending_review
    const { error: updateError } = await supabase
      .from('changes')
      .update({
        pending_review: false,
        is_noise: true,
        risk_level: 'low',
        risk_priority: 'low',
        summary: `[Dismissed] ${change.summary}`,
      })
      .eq('id', changeId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    console.log(`[review] Dismissed pending review change ${changeId} for "${displayName}"`);
    return NextResponse.json({ success: true, action: 'dismissed', changeId });
  }

  // Approve: clear pending_review, send notifications to users
  const { error: updateError } = await supabase
    .from('changes')
    .update({ pending_review: false })
    .eq('id', changeId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Send user notifications if risk level warrants it
  if (change.risk_level !== 'low' && !change.is_noise) {
    await sendChangeAlert({
      serviceName: displayName,
      docType: docTypeLabel,
      summary: change.summary,
      impact: change.impact || undefined,
      action: change.action || undefined,
      riskLevel: change.risk_level || 'medium',
      categories: change.categories || [],
      detectedAt: new Date(change.detected_at),
      vendorId: change.vendor_id,
      changeId: change.id,
    });

    await supabase
      .from('changes')
      .update({ notified: true })
      .eq('id', changeId);

    // Deliver webhooks and Slack notifications
    const webhookData = {
      changeId: change.id,
      vendorId: change.vendor_id,
      vendorName,
      documentType: docTypeLabel,
      severity: change.risk_level || 'medium',
      summary: change.summary || '',
      impact: change.impact || '',
      action: change.action || '',
      tags: change.categories || [],
    };

    try {
      await Promise.allSettled([
        deliverWebhooks(webhookData),
        deliverSlackNotifications(webhookData),
      ]);
    } catch (err) {
      console.error('[review] Webhook/Slack delivery error:', err);
    }
  }

  console.log(`[review] Approved pending review change ${changeId} for "${displayName}"`);
  return NextResponse.json({ success: true, action: 'approved', changeId, notified: change.risk_level !== 'low' });
}

// GET: List all pending review changes
export async function GET() {
  const { data: pending, error } = await supabase
    .from('changes')
    .select('*, vendors(name), documents(doc_type, url)')
    .eq('pending_review', true)
    .order('detected_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ pending: pending || [] });
}
