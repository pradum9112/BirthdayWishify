import dbConnect from './mongodb';
import EmailLog, { IEmailLogLean } from '@/models/EmailLog';

// Log a sent email to MongoDB
export async function logEmailSend(user: { name: string; email: string; dob: string }) {
  await dbConnect();
  await EmailLog.create({
    ...user,
    sentAt: new Date().toISOString(),
    sentAtDate: new Date().toISOString().slice(0, 10),
  });
}

// Get the count of emails sent today from MongoDB
export async function getTodayEmailCount(todayStr?: string): Promise<number> {
  await dbConnect();
  const today = todayStr || new Date().toISOString().slice(0, 10);
  return EmailLog.countDocuments({ sentAt: { $regex: `^${today}` } });
}

// Get logs from MongoDB, most recent first
export async function getLogs(limit = 50): Promise<IEmailLogLean[]> {
  await dbConnect();
  const rawLogs = await EmailLog.find({}).sort({ sentAt: -1 }).limit(limit).lean();
  return rawLogs.map((log: any) => ({
    name: log.name,
    dob: log.dob,
    email: log.email,
    sentAt: log.sentAt,
    sentAtDate: log.sentAtDate,
  }));
}
