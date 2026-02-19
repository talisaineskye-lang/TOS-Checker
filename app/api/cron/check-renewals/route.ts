import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';
import { deliverWebhooks } from '@/lib/webhooks/deliver';
import { deliverSlackNotifications } from '@/lib/webhooks/slack';

export const runtime = 'nodejs';

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContractRow {
  id: string;
  user_id: string;
  vendor_id: string;
  contract_renewal_date: string;
  notice_period_days: number;
  contract_value: string | null;
  notes: string | null;
  auto_renews: boolean;
  reminder_sent: boolean;
  vendors: { name: string } | { name: string }[];
}

function unwrap<T>(val: T | T[] | null): T | null {
  if (val == null) return null;
  return Array.isArray(val) ? val[0] ?? null : val;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date();
  const results: Array<Record<string, unknown>> = [];

  // Fetch all contracts that haven't sent reminders yet
  const { data: contracts, error } = await supabase
    .from('vendor_contracts')
    .select('id, user_id, vendor_id, contract_renewal_date, notice_period_days, contract_value, notes, auto_renews, reminder_sent, vendors(name)')
    .eq('reminder_sent', false);

  if (error || !contracts) {
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }

  for (const row of contracts as unknown as ContractRow[]) {
    const renewalDate = new Date(row.contract_renewal_date);
    const noticeDate = new Date(renewalDate);
    noticeDate.setDate(noticeDate.getDate() - row.notice_period_days);

    // Check if we've reached the notice period
    if (today < noticeDate) {
      continue;
    }

    const vendorObj = unwrap(row.vendors);
    const vendorName = vendorObj?.name || 'Unknown Vendor';
    const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const renewalStr = renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Get user's alert email
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', row.user_id)
      .single();

    const alertEmail = profile?.email || process.env.ALERT_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'StackDrift <alerts@stackdrift.app>';

    // Send renewal reminder email
    if (alertEmail && process.env.RESEND_API_KEY) {
      try {
        await resend.emails.send({
          from: fromEmail,
          to: alertEmail,
          subject: `[RENEWAL] ${vendorName} contract renews in ${daysUntilRenewal} days`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px;">
              <h2 style="margin-bottom: 4px;">Contract Renewal Reminder</h2>
              <p style="color: #666; margin-top: 0;">${vendorName}</p>
              <hr style="border: none; border-top: 1px solid #eee;" />
              <p><strong>Renewal date:</strong> ${renewalStr}</p>
              <p><strong>Days remaining:</strong> ${daysUntilRenewal}</p>
              <p><strong>Auto-renews:</strong> ${row.auto_renews ? 'Yes' : 'No'}</p>
              ${row.contract_value ? `<p><strong>Contract value:</strong> ${row.contract_value}</p>` : ''}
              ${row.notes ? `<p><strong>Notes:</strong> ${row.notes}</p>` : ''}
              <p style="margin-top: 24px;">
                <a href="https://www.stackdrift.app/dashboard" style="color: #4d8eff;">View in StackDrift &rarr;</a>
              </p>
              <p><small style="color: #999;">This is an automated renewal reminder from StackDrift.</small></p>
            </div>
          `
        });
        console.log(`[check-renewals] Reminder sent for ${vendorName} to ${alertEmail}`);
      } catch (err) {
        console.error(`[check-renewals] Failed to send reminder for ${vendorName}:`, err instanceof Error ? err.message : err);
      }
    }

    // Deliver via webhooks and Slack too
    try {
      const webhookData = {
        changeId: row.id,
        vendorId: row.vendor_id,
        vendorName,
        documentType: 'Contract Renewal',
        severity: 'medium',
        summary: `${vendorName} contract renews on ${renewalStr} (${daysUntilRenewal} days). ${row.auto_renews ? 'Auto-renews.' : 'Does NOT auto-renew.'}`,
        impact: row.notes || '',
        action: `Review contract before ${renewalStr}`,
        tags: ['renewal'],
      };

      await Promise.allSettled([
        deliverWebhooks(webhookData),
        deliverSlackNotifications(webhookData),
      ]);
    } catch (err) {
      console.error(`[check-renewals] Webhook/Slack delivery error for ${vendorName}:`, err);
    }

    // Mark reminder as sent
    await supabase
      .from('vendor_contracts')
      .update({ reminder_sent: true })
      .eq('id', row.id);

    results.push({
      vendor: vendorName,
      renewalDate: row.contract_renewal_date,
      daysUntil: daysUntilRenewal,
      status: 'reminder_sent',
    });
  }

  return NextResponse.json({ checked: contracts.length, reminders: results.length, results });
}
