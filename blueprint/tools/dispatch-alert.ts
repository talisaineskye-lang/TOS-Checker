/**
 * dispatch-alert.ts — Multi-channel alert dispatch for detected changes.
 *
 * Simplified version of StackDrift's production alert system.
 * All three channels are optional — only dispatches if the relevant env var is set.
 *
 * Channels:
 * - Email: Resend API with HTML template and severity color bar
 * - Slack: Incoming webhook with Block Kit formatting and severity emoji
 * - Webhook: HMAC-SHA256 signed POST payload
 *
 * Severity emoji mapping:
 *   critical = 🚨, high = ⚠️, medium = 📋, low = ℹ️
 */

import crypto from 'crypto';
import { logScan, type ScanLogEntry } from './store-result.js';

export interface AlertPayload {
  vendorSlug: string;
  vendorName: string;
  docType: string;
  summary: string;
  impact: string;
  action: string;
  riskLevel: string;
  categories: string[];
  detectedAt: Date;
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🚨',
  high: '⚠️',
  medium: '📋',
  low: 'ℹ️',
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high: { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  medium: { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  low: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

interface DispatchResult {
  channel: string;
  success: boolean;
  error?: string;
}

// --- Email via Resend ---

async function sendEmail(alert: AlertPayload): Promise<DispatchResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ALERT_EMAIL_TO;
  const fromEmail = process.env.ALERT_EMAIL_FROM || 'StackDrift Agent <alerts@stackdrift.app>';

  if (!apiKey || !toEmail) {
    return { channel: 'email', success: false, error: 'RESEND_API_KEY or ALERT_EMAIL_TO not set' };
  }

  const { Resend } = await import('resend');
  const resend = new Resend(apiKey);

  const riskLabel = alert.riskLevel.toUpperCase();
  const sev = SEVERITY_COLORS[alert.riskLevel] || SEVERITY_COLORS.medium;
  const summarySnippet = alert.summary.split(/[.!]/)[0].trim();
  const subject = `[${riskLabel}] ${alert.vendorName} — ${summarySnippet.slice(0, 80)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
  <tr><td style="height:4px;background:${sev.border};"></td></tr>
  <tr><td style="padding:24px 24px 0;">
    <table role="presentation" width="100%"><tr>
      <td><p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827;">${alert.vendorName}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;">${alert.docType}</p></td>
      <td align="right" valign="top">
        <span style="display:inline-block;padding:4px 10px;font-size:11px;font-weight:700;letter-spacing:0.06em;border-radius:4px;background:${sev.bg};color:${sev.text};border:1px solid ${sev.border};">${riskLabel}</span>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:16px 24px 0;"><hr style="margin:0;border:none;border-top:1px solid #e5e7eb;"></td></tr>
  <tr><td style="padding:16px 24px 0;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Summary</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#111827;">${alert.summary}</p>
  </td></tr>
  ${alert.impact ? `<tr><td style="padding:16px 24px 0;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Why it matters</p><p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${alert.impact}</p></td></tr>` : ''}
  ${alert.action ? `<tr><td style="padding:16px 24px 0;"><p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">What to do</p><p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${alert.action}</p></td></tr>` : ''}
  <tr><td style="padding:0 24px 20px;">
    <hr style="margin:16px 0 12px;border:none;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Detected ${alert.detectedAt.toISOString()} &mdash; StackDrift Agent Blueprint</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    await resend.emails.send({ from: fromEmail, to: toEmail, subject, html });
    return { channel: 'email', success: true };
  } catch (err) {
    return { channel: 'email', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// --- Slack via incoming webhook ---

async function sendSlack(alert: AlertPayload): Promise<DispatchResult> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const minSeverity = process.env.SLACK_MIN_SEVERITY || 'medium';

  if (!webhookUrl) {
    return { channel: 'slack', success: false, error: 'SLACK_WEBHOOK_URL not set' };
  }

  // Severity filtering
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const alertIdx = severityOrder.indexOf(alert.riskLevel);
  const minIdx = severityOrder.indexOf(minSeverity);
  if (alertIdx < minIdx) {
    return { channel: 'slack', success: false, error: `Severity ${alert.riskLevel} below minimum ${minSeverity}` };
  }

  const emoji = SEVERITY_EMOJI[alert.riskLevel] || 'ℹ️';
  const sevLabel = alert.riskLevel.charAt(0).toUpperCase() + alert.riskLevel.slice(1);

  const payload = {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} ${sevLabel}: ${alert.vendorName} ${alert.docType} Updated` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*${alert.vendorName}* — ${alert.docType}`,
            '', alert.summary, '',
            alert.impact ? `*Why it matters:* ${alert.impact}` : '',
            alert.action ? `*What to do:* ${alert.action}` : '',
          ].filter(Boolean).join('\n'),
        },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Slack returned ${res.status}`);
    return { channel: 'slack', success: true };
  } catch (err) {
    return { channel: 'slack', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// --- Webhook with HMAC-SHA256 signature ---

async function sendWebhook(alert: AlertPayload): Promise<DispatchResult> {
  const webhookUrl = process.env.WEBHOOK_URL;
  const secret = process.env.WEBHOOK_SECRET;

  if (!webhookUrl) {
    return { channel: 'webhook', success: false, error: 'WEBHOOK_URL not set' };
  }

  const payload = {
    event: 'vendor.change.detected',
    timestamp: alert.detectedAt.toISOString(),
    vendor: alert.vendorName,
    vendor_slug: alert.vendorSlug,
    document_type: alert.docType,
    severity: alert.riskLevel,
    summary: alert.summary,
    impact: alert.impact,
    action: alert.action,
    tags: alert.categories,
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-StackDrift-Event': 'vendor.change.detected',
  };

  if (secret) {
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    headers['X-StackDrift-Signature'] = signature;
  }

  // Retry up to 3 times on 5xx or network errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return { channel: 'webhook', success: true };

      if (res.status >= 500 && attempt < 3) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      return { channel: 'webhook', success: false, error: `HTTP ${res.status}` };
    } catch (err) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      return { channel: 'webhook', success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { channel: 'webhook', success: false, error: 'Max retries exceeded' };
}

/**
 * Dispatch alerts across all configured channels.
 * Only dispatches if the relevant env vars are set.
 * Logs all dispatch attempts to scan-log.json.
 */
export async function dispatchAlert(alert: AlertPayload): Promise<DispatchResult[]> {
  const results = await Promise.allSettled([
    sendEmail(alert),
    sendSlack(alert),
    sendWebhook(alert),
  ]);

  const dispatched: DispatchResult[] = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { channel: 'unknown', success: false, error: String(r.reason) }
  );

  // Log dispatch results
  const successChannels = dispatched.filter((d) => d.success).map((d) => d.channel);
  const failedChannels = dispatched.filter((d) => !d.success && !d.error?.includes('not set')).map((d) => `${d.channel}: ${d.error}`);

  if (successChannels.length > 0 || failedChannels.length > 0) {
    logScan({
      timestamp: new Date().toISOString(),
      vendorSlug: alert.vendorSlug,
      vendorName: alert.vendorName,
      docType: alert.docType,
      docUrl: '',
      status: 'alert_dispatched',
      details: {
        riskLevel: alert.riskLevel,
        successChannels,
        failedChannels,
      },
    });
  }

  return dispatched;
}
