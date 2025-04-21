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
  // Use India timezone for today
  const indiaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  const today = indiaDate;

  // Get users from MongoDB
  const users: IUserLean[] = await User.find({}).lean();
  // Deduplicate users by email
  const uniqueUsers: IUserLean[] = Array.from(new Map(users.map(u => [u.email, u])).values());
  // Only users whose birthday is today
  const todayBirthdayUsers: IUserLean[] = uniqueUsers.filter(user => isTodayBirthday(user.dob, today));

  // Load today's email logs to prevent duplicate sends
  const todayLogs: IEmailLogLean[] = await EmailLog.find({ sentAt: { $regex: `^${today}` } }).lean<IEmailLogLean>();
  const sent: string[] = [];
  for (const user of todayBirthdayUsers) {
    // Check if already sent today
    const alreadySent = todayLogs.some((log: IEmailLogLean) => log.email === user.email);
    if (!alreadySent) {
      try {
        await sendBirthdayEmail(user.email, user.name);
      } catch (emailErr: any) {
        console.error(`Failed to send birthday email to ${user.email}:`, emailErr);
        // Gmail sending limit error handling
        if (typeof emailErr?.message === 'string' && emailErr.message.includes('Daily user sending limit exceeded')) {
          return NextResponse.json({ error: 'limit_exceeded', message: 'Daily user sending limit exceeded. For more information on Gmail' }, { status: 429 });
        }
        continue; // Do not proceed to log if email failed
      }
      try {
        await EmailLog.create({ name: user.name, email: user.email, dob: user.dob, sentAt: new Date().toISOString() });
        logEmailSend(user);
        sent.push(user.email);
      } catch (logErr) {
        console.error(`Email sent to ${user.email}, but failed to log email:`, logErr);
      }
    }
  }
  // Return both the list of today's birthdays and which were emailed this run
  return NextResponse.json({ status: 'done', birthdaysToday: todayBirthdayUsers, sent });
}
