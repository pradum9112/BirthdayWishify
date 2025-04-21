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
  const users = (await User.find({}).lean() as unknown) as IUserLean[];
  // Deduplicate users by email
  const uniqueUsers: IUserLean[] = Array.from(new Map(users.map(u => [u.email, u])).values());
  // Only users whose birthday is today
  const todayBirthdayUsers: IUserLean[] = uniqueUsers.filter(user => isTodayBirthday(user.dob, today));

  const sent: string[] = [];
  for (const user of todayBirthdayUsers) {
    try {
      // Atomic upsert: only one request will send the email
      const log = await EmailLog.findOneAndUpdate(
        { email: user.email, sentAtDate: today },
        { $setOnInsert: { name: user.name, dob: user.dob, email: user.email, sentAt: new Date().toISOString(), sentAtDate: today } },
        { upsert: true, new: false }
      ).lean();
      if (!log) {
        await sendBirthdayEmail(user.email, user.name);
        logEmailSend(user);
        sent.push(user.email);
      }
      // If log existed, do nothing
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
