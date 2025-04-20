import { NextRequest, NextResponse } from 'next/server';
import { startBirthdayCron } from '@/utils/cronService';

let cronStarted = false;

export async function GET(req: NextRequest) {
  if (!cronStarted) {
    startBirthdayCron();
    cronStarted = true;
  }
  return NextResponse.json({ status: 'ok', message: 'Birthday cron started.' });
}
