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
  const riskLabel = riskLabelMap[change.riskLevel] ?? 'UNKNOWN';

  await resend.emails.send({
    from: 'TOS Monitor <alerts@yourdomain.com>',
    to: process.env.ALERT_EMAIL!,
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
}
