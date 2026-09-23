import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import * as schema from '@/db/schema';
import { gte, asc } from 'drizzle-orm';
import { MINIMUM_LEAD_HOURS, validateLeadTime } from '@/lib/transactions/order-transaction';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();

    // Fetch capacity for upcoming dates
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const capacities = await db
      .select()
      .from(schema.dailyCapacity)
      .where(gte(schema.dailyCapacity.bakeryDate, todayStr))
      .orderBy(asc(schema.dailyCapacity.bakeryDate));

    const slots = await db
      .select()
      .from(schema.pickupSlots)
      .where(gte(schema.pickupSlots.bakeryDate, todayStr))
      .orderBy(asc(schema.pickupSlots.bakeryDate), asc(schema.pickupSlots.startTime));

    // Combine by date
    const availability = capacities.map((cap: any) => {
      const dateStr = cap.bakeryDate instanceof Date 
        ? cap.bakeryDate.toISOString().split('T')[0]
        : String(cap.bakeryDate).split('T')[0];

      const leadTimeValid = validateLeadTime(dateStr);
      const remainingCakes = Math.max(0, cap.maxCakes - cap.reservedCakes);
      const isDateAvailable = leadTimeValid && !cap.isClosed && remainingCakes > 0;

      const dateSlots = slots
        .filter((s: any) => {
          const sDateStr = s.bakeryDate instanceof Date
            ? s.bakeryDate.toISOString().split('T')[0]
            : String(s.bakeryDate).split('T')[0];
          return sDateStr === dateStr;
        })
        .map((s: any) => ({
          id: s.id,
          startTime: s.startTime.substring(0, 5),
          endTime: s.endTime.substring(0, 5),
          maxOrders: s.maxOrders,
          bookedOrders: s.bookedOrders,
          availableOrders: Math.max(0, s.maxOrders - s.bookedOrders),
          isAvailable: isDateAvailable && s.bookedOrders < s.maxOrders,
        }));

      return {
        id: cap.id,
        date: dateStr,
        maxCakes: cap.maxCakes,
        reservedCakes: cap.reservedCakes,
        remainingCakes,
        isClosed: cap.isClosed,
        leadTimeValid,
        isAvailable: isDateAvailable,
        slots: dateSlots,
      };
    });

    return NextResponse.json({
      minimumLeadHours: MINIMUM_LEAD_HOURS,
      dates: availability,
    });
  } catch (error: any) {
    console.error('Error fetching capacity:', error);
    return NextResponse.json({ error: 'Failed to fetch bakery availability' }, { status: 500 });
  }
}
