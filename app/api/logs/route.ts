import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import EmailLog from '@/models/EmailLog';

export async function GET(req: NextRequest) {
  await dbConnect();
  const logs = await EmailLog.find({}).sort({ sentAt: -1 }).limit(100).lean();
  return NextResponse.json({ logs });
}

export async function DELETE(req: NextRequest) {
  await dbConnect();
  await EmailLog.deleteMany({});
  return NextResponse.json({ status: 'ok', message: 'Logs cleared.' });
}
