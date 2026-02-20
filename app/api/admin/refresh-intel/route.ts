import { NextResponse } from 'next/server';
import { updateScannerIntelItems } from '@/lib/intel/store';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const count = await updateScannerIntelItems();
    console.log(`[refresh-intel] Refreshed scanner Intel items: ${count} items`);
    return NextResponse.json({ success: true, itemCount: count });
  } catch (err) {
    console.error('[refresh-intel] Failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
