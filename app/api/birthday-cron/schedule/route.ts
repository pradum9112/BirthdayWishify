// schedule: "*/2 * * * *"
import { NextResponse } from 'next/server';
import dbConnect from '@/utils/mongodb';
import User, { IUser, IUserLean } from '@/models/User';
import EmailLog, { IEmailLog, IEmailLogLean } from '@/models/EmailLog';
import { sendBirthdayEmail } from '../../../../utils/emailService';
import { logEmailSend } from '../../../../utils/logger';

function isTodayBirthday(dob: string, todayStr?: string) {
  let today = todayStr ? new Date(todayStr) : new Date();
  const [year, month, day] = dob.split('-');
  return (
    today.getMonth() + 1 === parseInt(month, 10) &&
    today.getDate() === parseInt(day, 10)
  );
}

export async function GET() {
  await dbConnect();
  // Calculate cron window (2 minutes for testing)
  const cronIntervalMinutes = 2;
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (cronIntervalMinutes * 60 * 1000)) * cronIntervalMinutes * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + cronIntervalMinutes * 60 * 1000);

  // Use India timezone for today
  const indiaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  const today = indiaDate;

  // Get users from MongoDB
  const users = (await User.find({}).lean() as unknown) as IUserLean[];
  // Deduplicate users by email
  const uniqueUsers: IUserLean[] = Array.from(new Map(users.map(u => [u.email, u])).values());
  // Only users whose birthday is today
  const todayBirthdayUsers: IUserLean[] = uniqueUsers.filter(user => isTodayBirthday(user.dob, today));

  const sent: string[] = [];
  for (const user of todayBirthdayUsers) {
    try {
      // Per-cron-window deduplication: only send if no log exists in this window
      const existingLog = await EmailLog.findOne({
        email: user.email,
        sentAt: { $gte: windowStart.toISOString(), $lt: windowEnd.toISOString() }
      }).lean();
      if (!existingLog) {
        await sendBirthdayEmail(user.email, user.name);
        await EmailLog.create({
          name: user.name,
          dob: user.dob,
          email: user.email,
          sentAt: now.toISOString(),
          sentAtDate: today
        });
        logEmailSend(user);
        sent.push(user.email);
      }
    } catch (emailErr: any) {
      console.error(`Failed to send birthday email to ${user.email}:`, emailErr);
      // Gmail sending limit error handling
      if (typeof emailErr?.message === 'string' && emailErr.message.includes('Daily user sending limit exceeded')) {
        return NextResponse.json({ error: 'limit_exceeded', message: 'Daily user sending limit exceeded. For more information on Gmail' }, { status: 429 });
      }
      // Optionally: remove the log if sending failed
      await EmailLog.deleteOne({ email: user.email, sentAtDate: today });
    }
  }
  // Return both the list of today's birthdays and which were emailed this run
  return NextResponse.json({ status: 'done', birthdaysToday: todayBirthdayUsers, sent });
}
