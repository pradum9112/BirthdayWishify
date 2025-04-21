import cron from 'node-cron';
import { sendBirthdayEmail } from './emailService';
import { logEmailSend } from './logger';
import dbConnect from './mongodb';
import User from '@/models/User';
import EmailLog from '@/models/EmailLog';

function isTodayBirthday(dob: string, todayStr?: string) {
  let today = todayStr ? new Date(todayStr) : new Date();
  const [year, month, day] = dob.split('-');
  return (
    today.getMonth() + 1 === parseInt(month, 10) &&
    today.getDate() === parseInt(day, 10)
  );
}

let lastCronRun = 0;
let isRunning = false;

export function startBirthdayCron() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;
    try {
      await dbConnect();
      const now = Date.now();
      if (now - lastCronRun < 60 * 1000) { // 1 min gap
        isRunning = false;
        return;
      }
      lastCronRun = now;

      // Use India timezone for today
      const indiaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const today = indiaDate;

      // Fetch all users from DB
      const users = await User.find({}).lean();
      // Deduplicate users by email (latest entry wins)
      const uniqueUsers = Array.from(new Map(users.map((u: any) => [u.email, u])).values());

      // Fetch today's sent logs from DB
      const todayLogs = await EmailLog.find({ sentAt: { $regex: `^${today}` } }).lean();
      const sentEmails = new Set(todayLogs.map((log: any) => log.email));

      for (const user of uniqueUsers) {
        if (isTodayBirthday(user.dob, today) && !sentEmails.has(user.email)) {
          try {
            await sendBirthdayEmail(user.email, user.name);
            await logEmailSend(user);
            sentEmails.add(user.email);
          } catch (err) {
            console.error(`Failed to send birthday email to ${user.email}:`, err);
          }
        }
      }
    } finally {
      isRunning = false;
    }
  }, {
    timezone: 'Asia/Kolkata'
  });
}

// Remove auto-start to prevent duplicate cron jobs
// startBirthdayCron();
