import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import EmailLog from '@/models/EmailLog';

export async function GET(req: NextRequest) {
  await dbConnect();
  const logsRaw = await EmailLog.find({}).sort({ sentAt: -1 }).limit(100).lean();
  // Deduplicate logs by email+sentAt (backend safety)
  const seen = new Set();
  const logs = [];
  for (const log of logsRaw) {
    const key = `${log.email}_${log.sentAt}`;
    if (!seen.has(key)) {
      seen.add(key);
      logs.push(log);
    }
  }
  return NextResponse.json({ logs });
}

export async function DELETE(req: NextRequest) {
  await dbConnect();
  await EmailLog.deleteMany({});
  return NextResponse.json({ status: 'ok', message: 'Logs cleared.' });
}
