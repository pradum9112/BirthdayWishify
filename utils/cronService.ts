import cron from 'node-cron';
import { sendBirthdayEmail } from './emailService';
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

      for (const user of uniqueUsers) {
        if (isTodayBirthday(user.dob, today)) {
          // Atomically insert a log for this user for today, only if it doesn't exist
          const log = await EmailLog.findOneAndUpdate(
            { email: user.email, sentAt: { $regex: `^${today}` } },
            { $setOnInsert: { name: user.name, dob: user.dob, email: user.email, sentAt: new Date().toISOString() } },
            { upsert: true, new: false }
          ).lean();

          if (!log) {
            // If log was just inserted (i.e., this is the first send today), send the email
            try {
              await sendBirthdayEmail(user.email, user.name);
            } catch (err) {
              console.error(`Failed to send birthday email to ${user.email}:`, err);
              // Optionally: remove the log if sending failed
              await EmailLog.deleteOne({ email: user.email, sentAt: { $regex: `^${today}` } });
            }
          }
          // If log was not null, email was already sent today, do nothing
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
