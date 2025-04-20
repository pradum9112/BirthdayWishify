import { NextRequest, NextResponse } from 'next/server';
import { getLogs } from '@/utils/logger';
import fs from 'fs';
import path from 'path';

const LOG_PATH = path.resolve(process.cwd(), 'data/emailLogs.json');

export async function GET(req: NextRequest) {
  const logs = getLogs(100);
  return NextResponse.json({ logs });
}

export async function DELETE(req: NextRequest) {
  fs.writeFileSync(LOG_PATH, JSON.stringify([], null, 2));
  return NextResponse.json({ status: 'ok', message: 'Logs cleared.' });
}
