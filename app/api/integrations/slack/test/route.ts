import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requirePlan } from '@/lib/plan-gates.server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const gate = await requirePlan('pro');
  if (!gate.authorized) {
    return NextResponse.json(gate.body, { status: gate.status });
  }

  const { webhook_url } = await request.json();

  if (!webhook_url) {
    // Try to get from saved integration
    const { data: integration } = await supabase
      .from('user_integrations')
      .select('config_json')
      .eq('user_id', gate.userId)
      .eq('type', 'slack')
      .single();

    const url = (integration?.config_json as { webhook_url?: string })?.webhook_url;
    if (!url) {
      return NextResponse.json({ error: 'No Slack webhook URL configured' }, { status: 400 });
    }

    return sendTest(url);
  }

  return sendTest(webhook_url);
}

async function sendTest(url: string) {
  const testPayload = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '\ud83d\udfe1 Test: StackDrift Webhook Connected',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*StackDrift* \u2014 Test Alert\n\nThis is a test notification from StackDrift. Your Slack integration is working correctly.\n\n*Why it matters:* You\'ll receive real-time alerts when vendor policies change.\n\n*What to do:* No action needed \u2014 you\'re all set!',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in StackDrift' },
            url: 'https://www.stackdrift.app/dashboard',
          },
        ],
      },
    ],
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return NextResponse.json({
      success: res.ok,
      statusCode: res.status,
      message: res.ok ? 'Test message sent to Slack' : `Slack returned ${res.status}`,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      statusCode: 0,
      message: err instanceof Error ? err.message : 'Network error',
    });
  }
}
