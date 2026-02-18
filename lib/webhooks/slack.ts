import { supabase } from '@/lib/supabase';

interface SlackChangeData {
  vendorName: string;
  documentType: string;
  severity: string;
  summary: string;
  impact: string;
  action: string;
  changeId: string;
}

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '\ud83d\udd34',
  warning: '\ud83d\udfe1',
  notice: '\ud83d\udd35',
  low: '\u26aa',
};

function buildSlackBlocks(data: SlackChangeData) {
  const emoji = SEVERITY_EMOJI[data.severity] || '\u26aa';
  const sevLabel = data.severity.charAt(0).toUpperCase() + data.severity.slice(1);

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${sevLabel}: ${data.vendorName} ${data.documentType} Updated`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `*${data.vendorName}* \u2014 ${data.documentType}`,
            '',
            data.summary,
            '',
            data.impact ? `*Why it matters:* ${data.impact}` : '',
            data.action ? `*What to do:* ${data.action}` : '',
          ].filter(Boolean).join('\n'),
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in StackDrift' },
            url: 'https://www.stackdrift.app/dashboard/history',
          },
        ],
      },
    ],
  };
}

function severityMatchesFilter(severity: string, filter: string[]): boolean {
  return filter.includes(severity);
}

/**
 * Deliver Slack notifications for a detected change.
 */
export async function deliverSlackNotifications(data: SlackChangeData): Promise<void> {
  // Find all active Slack integrations
  const { data: integrations } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('type', 'slack')
    .eq('active', true);

  if (!integrations || integrations.length === 0) return;

  const payload = buildSlackBlocks(data);

  await Promise.allSettled(
    integrations.map(async (integration) => {
      const config = integration.config_json as {
        webhook_url?: string;
        severity_filter?: string[];
      };

      if (!config?.webhook_url) return;

      // Check severity filter
      const filter = config.severity_filter || ['critical', 'warning', 'notice'];
      if (!severityMatchesFilter(data.severity, filter)) return;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);
      } catch (err) {
        console.error(`[slack] Failed to deliver to user ${integration.user_id}:`, err instanceof Error ? err.message : err);
      }
    })
  );
}
