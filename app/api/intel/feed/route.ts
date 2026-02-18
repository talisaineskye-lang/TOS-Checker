import { NextRequest, NextResponse } from 'next/server';
import { getFeed, getWeeklyChangeCount } from '@/lib/intel/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const [feed, weeklyChanges] = await Promise.all([
    getFeed({
      pillar: searchParams.get('pillar') || undefined,
      limit: parseInt(searchParams.get('limit') || '20', 10),
      hoursBack: parseInt(searchParams.get('hours') || '72', 10),
    }),
    getWeeklyChangeCount(),
  ]);

  return NextResponse.json({
    items: feed,
    scannerMeta: { totalChangesThisWeek: weeklyChanges },
  });
}
