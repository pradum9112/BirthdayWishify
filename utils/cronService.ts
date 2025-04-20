import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { sendBirthdayEmail } from './emailService';
import { logEmailSend, getLogs } from './logger';

const USERS_PATH = path.resolve(process.cwd(), 'data/users.json');
const LOG_PATH = path.resolve(process.cwd(), 'data/emailLogs.json');

function isTodayBirthday(dob: string) {
  const today = new Date();
  const [year, month, day] = dob.split('-');
  return (
    today.getMonth() + 1 === parseInt(month, 10) &&
    today.getDate() === parseInt(day, 10)
  );
}

let lastCronRun = 0;
let isRunning = false;

export function startBirthdayCron() {
  // Run every 2 minutes
  cron.schedule('*/2 * * * *', async () => {
    if (isRunning) return; // Prevent overlapping runs
    isRunning = true;
    try {
      const now = Date.now();
      if (now - lastCronRun < 60 * 1000) { // 1 min gap
        isRunning = false;
        return;
      }
      lastCronRun = now;

      if (!fs.existsSync(USERS_PATH)) {
        isRunning = false;
        return;
      }
      const users: { name: string; email: string; dob: string }[] = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
      // Deduplicate users by email (latest entry wins)
      const uniqueUsers = Array.from(
        new Map(users.map((u: { name: string; email: string; dob: string }) => [u.email, u])).values()
      );
      const emailed = new Set<string>();

      for (const user of uniqueUsers) {
        if (isTodayBirthday(user.dob) && !emailed.has(user.email)) {
          try {
            await sendBirthdayEmail(user.email, user.name);
            logEmailSend(user);
            emailed.add(user.email);
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
