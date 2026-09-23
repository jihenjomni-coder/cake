import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { eq, gte, asc } from 'drizzle-orm';
import { getSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'BAKER') {
      return NextResponse.json({ error: 'Forbidden: Baker access required' }, { status: 403 });
    }

    const db = getDatabase();
    const todayStr = new Date().toISOString().split('T')[0];

    const capacities = await db
      .select()
      .from(schema.dailyCapacity)
      .where(gte(schema.dailyCapacity.bakeryDate, todayStr))
      .orderBy(asc(schema.dailyCapacity.bakeryDate));

    return NextResponse.json({ capacities });
  } catch (error: any) {
    console.error('Error fetching capacity schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch capacity schedule' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'BAKER') {
      return NextResponse.json({ error: 'Forbidden: Baker access required' }, { status: 403 });
    }

    const { bakeryDate, maxCakes, isClosed } = await request.json();

    if (!bakeryDate) {
      return NextResponse.json({ error: 'bakeryDate is required' }, { status: 400 });
    }

    const db = getDatabase();

    const [existing] = await db
      .select()
      .from(schema.dailyCapacity)
      .where(eq(schema.dailyCapacity.bakeryDate, bakeryDate));

    if (maxCakes !== undefined && existing && maxCakes < existing.reservedCakes) {
      return NextResponse.json(
        {
          error: `Cannot reduce max capacity below currently reserved cakes (${existing.reservedCakes}).`,
        },
        { status: 400 }
      );
    }

    const updateValues: any = { updatedAt: new Date() };
    if (maxCakes !== undefined) updateValues.maxCakes = maxCakes;
    if (isClosed !== undefined) updateValues.isClosed = isClosed;

    const [updated] = await db
      .insert(schema.dailyCapacity)
      .values({
        bakeryDate,
        maxCakes: maxCakes ?? 10,
        reservedCakes: 0,
        isClosed: isClosed ?? false,
      })
      .onConflictDoUpdate({
        target: schema.dailyCapacity.bakeryDate,
        set: updateValues,
      })
      .returning();

    // Audit Log
    await db.insert(schema.auditLogs).values({
      entityType: 'capacity',
      entityId: updated.id,
      action: 'CAPACITY_UPDATED',
      actorId: session.userId,
      changes: JSON.stringify(updateValues),
    });

    return NextResponse.json({
      success: true,
      capacity: updated,
      message: 'Bakery capacity updated successfully.',
    });
  } catch (error: any) {
    console.error('Error updating capacity:', error);
    return NextResponse.json({ error: error.message || 'Failed to update capacity' }, { status: 500 });
  }
}
