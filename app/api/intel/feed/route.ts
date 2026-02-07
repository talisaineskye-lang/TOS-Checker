import { NextRequest, NextResponse } from 'next/server';
import { getFeed } from '@/lib/intel/store';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const feed = await getFeed({
    pillar: searchParams.get('pillar') || undefined,
    limit: parseInt(searchParams.get('limit') || '20', 10),
    hoursBack: parseInt(searchParams.get('hours') || '72', 10),
  });

  return NextResponse.json({ items: feed });
}
