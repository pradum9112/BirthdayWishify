import fs from 'fs';
import path from 'path';
import { getTodayEmailCount, getLogs } from '@/utils/logger';

const USERS_PATH = path.resolve(process.cwd(), 'data/users.json');
const LOG_PATH = path.resolve(process.cwd(), 'data/logs.json');

function getUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

function isTodayBirthday(dob: string, todayStr?: string) {
  let today = todayStr ? new Date(todayStr) : new Date();
  const [year, month, day] = dob.split('-');
  return (
    today.getMonth() + 1 === parseInt(month, 10) &&
    today.getDate() === parseInt(day, 10)
  );
}

function getTodayEmailCount(todayStr?: string): number {
  if (!fs.existsSync(LOG_PATH)) return 0;
  const logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
  const today = todayStr || new Date().toISOString().slice(0, 10);
  return logs.filter((log: any) => log.sentAt.startsWith(today)).length;
}

export async function GET() {
  const users = getUsers();
  // Use India timezone for today
  const indiaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  const today = indiaDate;
  const usersWithBirthday = users.filter((u: any) => isTodayBirthday(u.dob, today));
  const emailsSentToday = getTodayEmailCount(today);
  const logs = getLogs(20);
  return Response.json({ users, today, usersWithBirthday, emailsSentToday, logs });
}
