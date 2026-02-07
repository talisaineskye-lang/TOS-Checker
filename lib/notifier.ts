import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ChangeNotification {
  serviceName: string;
  summary: string;
  riskLevel: string;
  categories: string[];
  detectedAt: Date;
}

const riskLabelMap: Record<string, string> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH'
};

export async function sendChangeAlert(change: ChangeNotification) {
  const alertEmail = process.env.ALERT_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'TOS Monitor <alerts@yourdomain.com>';

  if (!alertEmail) {
    console.warn('[notifier] ALERT_EMAIL not set — skipping email notification');
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('[notifier] RESEND_API_KEY not set — skipping email notification');
    return;
  }

  const riskLabel = riskLabelMap[change.riskLevel] ?? 'UNKNOWN';

  try {
    await resend.emails.send({
      from: fromEmail,
      to: alertEmail,
      subject: `[${riskLabel}] ${change.serviceName} Terms Changed`,
      html: `
        <h2>${change.serviceName} Terms of Service Changed</h2>
        <p><strong>Risk Level:</strong> ${riskLabel}</p>
        <p><strong>Categories:</strong> ${change.categories.join(', ')}</p>
        <h3>Summary</h3>
        <p>${change.summary}</p>
        <p><small>Detected: ${change.detectedAt.toISOString()}</small></p>
      `
    });
    console.log(`[notifier] Alert sent to ${alertEmail} for ${change.serviceName}`);
  } catch (err) {
    console.error(
      '[notifier] Failed to send email:',
      err instanceof Error ? err.message : err
    );
  }
}
