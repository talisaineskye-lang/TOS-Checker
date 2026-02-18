import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { webhookId } = await request.json();

  const { data: webhook } = await supabase
    .from('user_webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('user_id', gate.userId)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const testPayload = {
    event: 'vendor.change.detected',
    timestamp: new Date().toISOString(),
    vendor: 'StackDrift Test',
    document_type: 'Terms of Service',
    severity: 'warning',
    summary: 'This is a test webhook delivery from StackDrift.',
    impact: 'No real impact — this is a test payload to verify your webhook endpoint.',
    action: 'Confirm you received this payload and the signature validates.',
    tags: ['test'],
    diff_url: 'https://www.stackdrift.app/dashboard/history',
  };

  const body = JSON.stringify(testPayload);
  const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-StackDrift-Signature': signature,
        'X-StackDrift-Event': 'vendor.change.detected',
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseBody = await res.text();

    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      change_id: null,
      status_code: res.status,
      response_body: responseBody.slice(0, 500),
      attempted_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: res.ok,
      statusCode: res.status,
      message: res.ok ? 'Test delivered successfully' : `Endpoint returned ${res.status}`,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      statusCode: 0,
      message: err instanceof Error ? err.message : 'Network error',
    });
  }
}
