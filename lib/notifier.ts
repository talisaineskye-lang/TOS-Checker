import { Resend } from 'resend';
import { supabase } from './supabase';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ChangeNotification {
  serviceName: string;
  docType?: string;
  summary: string;
  impact?: string;
  action?: string;
  riskLevel: string;
  categories: string[];
  detectedAt: Date;
  vendorId?: string;
  changeId?: string;
}

const riskLabelMap: Record<string, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  high:     { bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  medium:   { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  low:      { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

function buildEmailHtml(change: ChangeNotification, riskLabel: string, options?: { sharedRoute?: string }): string {
  const sev = severityColors[change.riskLevel] || severityColors.medium;
  const detectedStr = change.detectedAt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const dashboardUrl = change.changeId
    ? 'https://www.stackdrift.app/dashboard/history'
    : 'https://www.stackdrift.app/dashboard';

  const categoryTags = change.categories.length > 0
    ? change.categories.map(c =>
        `<span style="display:inline-block;padding:2px 8px;margin:0 4px 4px 0;font-size:11px;font-weight:600;border-radius:4px;background:#f3f4f6;color:#374151;letter-spacing:0.02em;">${c}</span>`
      ).join('')
    : '';

  const impactSection = change.impact
    ? `<tr><td style="padding:16px 24px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Why it matters</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${change.impact}</p>
      </td></tr>`
    : '';

  const actionSection = change.action
    ? `<tr><td style="padding:16px 24px 0;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">What to do</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${change.action}</p>
      </td></tr>`
    : '';

  const sharedNote = options?.sharedRoute
    ? `<p style="margin:0;font-size:11px;color:#9ca3af;">Sent to ${options.sharedRoute} via shared alert routing.</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">

  <!-- Severity bar -->
  <tr><td style="height:4px;background:${sev.border};"></td></tr>

  <!-- Header -->
  <tr><td style="padding:24px 24px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#111827;">${change.serviceName}</p>
          ${change.docType ? `<p style="margin:0;font-size:13px;color:#6b7280;">${change.docType}</p>` : ''}
        </td>
        <td align="right" valign="top">
          <span style="display:inline-block;padding:4px 10px;font-size:11px;font-weight:700;letter-spacing:0.06em;border-radius:4px;background:${sev.bg};color:${sev.text};border:1px solid ${sev.border};">${riskLabel}</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:16px 24px 0;"><hr style="margin:0;border:none;border-top:1px solid #e5e7eb;"></td></tr>

  <!-- Summary -->
  <tr><td style="padding:16px 24px 0;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Summary</p>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#111827;">${change.summary}</p>
  </td></tr>

  ${impactSection}
  ${actionSection}

  <!-- Categories -->
  ${categoryTags ? `<tr><td style="padding:16px 24px 0;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;">Categories</p>
    <div>${categoryTags}</div>
  </td></tr>` : ''}

  <!-- CTA Button -->
  <tr><td style="padding:24px;">
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr><td style="border-radius:6px;background:#111827;">
        <a href="${dashboardUrl}" target="_blank" style="display:inline-block;padding:10px 20px;font-size:13px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">View full details &rarr;</a>
      </td></tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:0 24px 20px;">
    <hr style="margin:0 0 12px;border:none;border-top:1px solid #e5e7eb;">
    <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;">Detected ${detectedStr}</p>
    ${sharedNote}
    <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">
      <a href="https://www.stackdrift.app" style="color:#6b7280;text-decoration:none;font-weight:600;">StackDrift</a> &mdash; Vendor policy monitoring for teams that ship.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendChangeAlert(change: ChangeNotification) {
  const alertEmail = process.env.ALERT_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'StackDrift Alerts <alerts@stackdrift.app>';

  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifier] RESEND_API_KEY not set — skipping email notification');
    return;
  }

  const riskLabel = riskLabelMap[change.riskLevel] ?? 'NOTICE';

  // Build a descriptive subject from the summary (first sentence, truncated)
  const summarySnippet = change.summary.split(/[.!]/)[0].trim();
  const subjectDetail = summarySnippet.length > 80
    ? summarySnippet.slice(0, 77) + '...'
    : summarySnippet;
  const subject = `[${riskLabel}] ${change.serviceName} — ${subjectDetail}`;

  const html = buildEmailHtml(change, riskLabel);

  // Send to primary alert email
  if (alertEmail) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: alertEmail,
        subject,
        html,
      });
      console.log(`[notifier] Alert sent to ${alertEmail} for ${change.serviceName}`);
    } catch (err) {
      console.error(
        '[notifier] Failed to send email:',
        err instanceof Error ? err.message : err
      );
    }
  }

  // Deliver to shared team alert routes
  await deliverTeamAlertRoutes(change, riskLabel, fromEmail);
}

async function deliverTeamAlertRoutes(
  change: ChangeNotification,
  riskLabel: string,
  fromEmail: string
) {
  try {
    // Find all active alert routes
    const { data: routes } = await supabase
      .from('team_alert_routes')
      .select('id, team_id, email, severity_filter, vendor_filter')
      .eq('active', true);

    if (!routes || routes.length === 0) return;

    const severityMap: Record<string, string[]> = {
      all: ['low', 'medium', 'high', 'critical'],
      critical: ['high', 'critical'],
      warning_critical: ['medium', 'high', 'critical'],
    };

    for (const route of routes) {
      // Check severity filter
      const allowedSeverities = severityMap[route.severity_filter] || severityMap.all;
      if (!allowedSeverities.includes(change.riskLevel)) continue;

      // Check vendor filter
      if (route.vendor_filter !== 'all' && change.vendorId) {
        const filterVendors = route.vendor_filter.split(',').map((v: string) => v.trim());
        if (!filterVendors.includes(change.vendorId)) continue;
      }

      const summarySnippet = change.summary.split(/[.!]/)[0].trim();
      const subjectDetail = summarySnippet.length > 80
        ? summarySnippet.slice(0, 77) + '...'
        : summarySnippet;

      const html = buildEmailHtml(change, riskLabel, { sharedRoute: route.email });

      try {
        await resend.emails.send({
          from: fromEmail,
          to: route.email,
          subject: `[${riskLabel}] ${change.serviceName} — ${subjectDetail}`,
          html,
        });
        console.log(`[notifier] Shared alert sent to ${route.email} for ${change.serviceName}`);
      } catch (err) {
        console.error(`[notifier] Failed to send shared alert to ${route.email}:`, err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    console.error('[notifier] Failed to deliver team alert routes:', err instanceof Error ? err.message : err);
  }
}
