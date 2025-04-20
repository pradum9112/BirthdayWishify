import fs from 'fs';
import path from 'path';
import { getTodayEmailCount, getLogs } from '@/utils/logger';

const USERS_PATH = path.resolve(process.cwd(), 'data/users.json');

function getUsers() {
  if (!fs.existsSync(USERS_PATH)) return [];
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf-8'));
}

function isTodayBirthday(dob: string) {
  const today = new Date();
  const [year, month, day] = dob.split('-');
  return (
    today.getMonth() + 1 === parseInt(month, 10) &&
    today.getDate() === parseInt(day, 10)
  );
}

export async function GET() {
  const users = getUsers();
  const today = new Date().toISOString().slice(0, 10);
  const usersWithBirthday = users.filter((u: any) => isTodayBirthday(u.dob));
  const emailsSentToday = getTodayEmailCount();
  const logs = getLogs(20);
  return Response.json({ users, today, usersWithBirthday, emailsSentToday, logs });
}
