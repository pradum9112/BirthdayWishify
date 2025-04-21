// IMPORTANT: This endpoint must be triggered by an external scheduler (e.g., EasyCron, cron-job.org, GitHub Actions) every 5 minutes in production.
// Serverless environments do NOT run background jobs. See documentation for details.

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

// Distributed lock collection name
const LOCK_COLLECTION = 'cronlocks';
const LOCK_ID = 'birthday-cron-lock';
const LOCK_TTL_SECONDS = 55; // Slightly less than 1 minute

async function acquireLock() {
  const mongoose = require('mongoose');
  const LockSchema = new mongoose.Schema({
    _id: String,
    expiresAt: { type: Date, expires: 0 },
  }, { collection: LOCK_COLLECTION });
  const Lock = mongoose.models.CronLock || mongoose.model('CronLock', LockSchema);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + LOCK_TTL_SECONDS * 1000);
  try {
    await Lock.create({ _id: LOCK_ID, expiresAt });
    return true;
  } catch (err: any) {
    // Duplicate key error means lock already exists
    return false;
  }
}

async function releaseLock() {
  const mongoose = require('mongoose');
  const Lock = mongoose.models.CronLock || mongoose.model('CronLock');
  await Lock.deleteOne({ _id: LOCK_ID });
}

export async function GET() {
  await dbConnect();

  // Try to acquire distributed lock
  const gotLock = await acquireLock();
  if (!gotLock) {
    return NextResponse.json({ status: 'skipped', message: 'Another cron is running.' }, { status: 200 });
  }

  try {
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
  } finally {
    await releaseLock();
  }
}
