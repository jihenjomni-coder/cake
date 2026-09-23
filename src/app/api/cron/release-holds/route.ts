import { NextRequest, NextResponse } from 'next/server';
import { releaseExpiredHolds } from '@/lib/transactions/order-transaction';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleRelease(request);
}

export async function POST(request: NextRequest) {
  return handleRelease(request);
}

async function handleRelease(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // Verify CRON_SECRET if configured in production
  if (cronSecret) {
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron secret' }, { status: 401 });
    }
  }

  try {
    const result = await releaseExpiredHolds();
    return NextResponse.json({
      success: true,
      message: `Released ${result.releasedCount} expired capacity hold(s).`,
      releasedCount: result.releasedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error releasing expired holds:', error);
    return NextResponse.json(
      { error: 'Failed to release expired holds', details: error.message },
      { status: 500 }
    );
  }
}
