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

let isRunning = false;

// Standalone cron job for production deployment
export function startBirthdayCron() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;
    try {
      await dbConnect();

      // Calculate cron window
      const cronIntervalMinutes = 5;
      const now = new Date();
      const windowStart = new Date(Math.floor(now.getTime() / (cronIntervalMinutes * 60 * 1000)) * cronIntervalMinutes * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + cronIntervalMinutes * 60 * 1000);

      // Use India timezone for today
      const indiaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const today = indiaDate;

      // Fetch all users from DB
      const users = await User.find({}).lean();
      // Deduplicate users by email (latest entry wins)
      const uniqueUsers = Array.from(new Map(users.map((u: any) => [u.email, u])).values());

      for (const user of uniqueUsers) {
        if (isTodayBirthday(user.dob, today)) {
          // Check if a log for this user exists in this cron window
          const existingLog = await EmailLog.findOne({
            email: user.email,
            sentAt: { $gte: windowStart.toISOString(), $lt: windowEnd.toISOString() }
          }).lean();
          if (!existingLog) {
            try {
              await sendBirthdayEmail(user.email, user.name);
              try {
                await EmailLog.create({
                  name: user.name,
                  dob: user.dob,
                  email: user.email,
                  sentAt: now.toISOString(),
                  sentAtDate: today
                });
              } catch (err: any) {
                if (err.code === 11000) {
                  // Duplicate key error: another process already inserted, safe to ignore
                } else {
                  throw err;
                }
              }
            } catch (err) {
              console.error(`Failed to send birthday email to ${user.email}:`, err);
            }
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
// DO NOT call startBirthdayCron() here! Only call it from cron-worker.ts for standalone deployment.
// startBirthdayCron();
