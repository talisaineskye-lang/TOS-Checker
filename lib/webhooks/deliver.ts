import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export interface WebhookPayload {
  event: 'vendor.change.detected';
  timestamp: string;
  vendor: string;
  document_type: string;
  severity: string;
  summary: string;
  impact: string;
  action: string;
  tags: string[];
  diff_url: string;
}

interface UserWebhook {
  id: string;
  user_id: string;
  url: string;
  events_filter: string; // 'all' | 'critical' | 'warning_critical' | comma-separated vendor IDs
  secret: string;
  active: boolean;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function severityMatchesFilter(severity: string, filter: string, vendorId: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'critical') return severity === 'critical';
  if (filter === 'warning_critical') return severity === 'critical' || severity === 'warning';
  // Check if filter is a comma-separated list of vendor IDs
  if (filter.includes(',') || filter.length === 36) {
    return filter.split(',').map((s) => s.trim()).includes(vendorId);
  }
  return true;
}

async function deliverSingle(
  webhook: UserWebhook,
  payload: WebhookPayload,
  changeId: string,
  attempt: number = 1
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, webhook.secret);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-StackDrift-Signature': signature,
        'X-StackDrift-Event': payload.event,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Log delivery
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      change_id: changeId,
      status_code: res.status,
      response_body: (await res.text()).slice(0, 500),
      attempted_at: new Date().toISOString(),
    });

    // Retry on failure (5xx or timeout)
    if (res.status >= 500 && attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
      await new Promise((r) => setTimeout(r, delay));
      return deliverSingle(webhook, payload, changeId, attempt + 1);
    }
  } catch (err) {
    // Log failed delivery
    await supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      change_id: changeId,
      status_code: 0,
      response_body: err instanceof Error ? err.message : 'Network error',
      attempted_at: new Date().toISOString(),
    });

    // Retry on network error
    if (attempt < 3) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise((r) => setTimeout(r, delay));
      return deliverSingle(webhook, payload, changeId, attempt + 1);
    }
  }
}

/**
 * Deliver webhook notifications for a detected change.
 * Called from the check-tos cron after a change is analyzed.
 */
export async function deliverWebhooks(changeData: {
  changeId: string;
  vendorId: string;
  vendorName: string;
  documentType: string;
  severity: string;
  summary: string;
  impact: string;
  action: string;
  tags: string[];
}): Promise<void> {
  // Find all active webhooks
  const { data: webhooks } = await supabase
    .from('user_webhooks')
    .select('*')
    .eq('active', true);

  if (!webhooks || webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event: 'vendor.change.detected',
    timestamp: new Date().toISOString(),
    vendor: changeData.vendorName,
    document_type: changeData.documentType,
    severity: changeData.severity,
    summary: changeData.summary,
    impact: changeData.impact,
    action: changeData.action,
    tags: changeData.tags,
    diff_url: `https://www.stackdrift.app/dashboard/history`,
  };

  // Filter and deliver to matching webhooks
  const matching = webhooks.filter((wh: UserWebhook) =>
    severityMatchesFilter(changeData.severity, wh.events_filter, changeData.vendorId)
  );

  await Promise.allSettled(
    matching.map((wh: UserWebhook) => deliverSingle(wh, payload, changeData.changeId))
  );
}
