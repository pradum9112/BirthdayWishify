import { NextRequest, NextResponse } from 'next/server';
// import { startBirthdayCron } from '@/utils/cronService';

const globalWithCron = global as typeof globalThis & { cronStarted?: boolean };

export async function GET(req: NextRequest) {
  // The local cron has been disabled for production safety.
  // Use the /api/birthday-cron/schedule endpoint and an external scheduler for birthday emails.
  return NextResponse.json({ status: 'ok', message: 'Birthday cron is managed by the schedule endpoint.' });
}
