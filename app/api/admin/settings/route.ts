import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET() {
  const { data, error } = await supabase.from('app_settings').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Convert array to object
  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const updates: { key: string; value: string }[] = [];

  if (body.alertEmail !== undefined) {
    updates.push({ key: 'alert_email', value: body.alertEmail });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No settings to update' }, { status: 400 });
  }

  for (const { key, value } of updates) {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
