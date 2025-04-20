// schedule: "*/2 * * * *"
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { sendBirthdayEmail } from '../../../../utils/emailService';
import { logEmailSend } from '../../../../utils/logger';

const USERS_PATH = path.resolve(process.cwd(), 'data/users.json');

function isTodayBirthday(dob: string) {
  const today = new Date();
  const [year, month, day] = dob.split('-');
  return (
    today.getMonth() + 1 === parseInt(month, 10) &&
    today.getDate() === parseInt(day, 10)
  );
}

export async function GET() {
  if (!fs.existsSync(USERS_PATH)) {
    return NextResponse.json({ status: 'no_users_file' });
  }
  const users: { name: string; email: string; dob: string }[] = JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
  // Deduplicate users by email (latest entry wins)
  const uniqueUsers = Array.from(
    new Map(users.map((u: { name: string; email: string; dob: string }) => [u.email, u])).values()
  );
  const emailed = new Set<string>();
  const sent: string[] = [];

  // --- Load today's email logs to prevent duplicate sends ---
  const LOG_PATH = path.resolve(process.cwd(), 'data/emailLogs.json');
  let todayLogs: any[] = [];
  if (fs.existsSync(LOG_PATH)) {
    const logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
    const today = new Date().toISOString().slice(0, 10);
    todayLogs = logs.filter((log: any) => log.sentAt && log.sentAt.startsWith(today));
  }

  for (const user of uniqueUsers) {
    if (isTodayBirthday(user.dob) && !emailed.has(user.email)) {
      // Check if already sent today
      const alreadySent = todayLogs.some((log: any) => log.email === user.email);
      if (alreadySent) continue;
      try {
        await sendBirthdayEmail(user.email, user.name);
        logEmailSend(user);
        emailed.add(user.email);
        sent.push(user.email);
      } catch (err) {
        console.error(`Failed to send birthday email to ${user.email}:`, err);
      }
    }
  }
  return NextResponse.json({ status: 'done', sent });
}
