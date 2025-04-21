import { NextRequest, NextResponse } from 'next/server';
import { startBirthdayCron } from '@/utils/cronService';

const globalWithCron = global as typeof globalThis & { cronStarted?: boolean };

export async function GET(req: NextRequest) {
  if (!globalWithCron.cronStarted) {
    startBirthdayCron();
    globalWithCron.cronStarted = true;
  }
  return NextResponse.json({ status: 'ok', message: 'Birthday cron started.' });
}
