import fs from 'fs';
import path from 'path';

const LOG_PATH = path.resolve(process.cwd(), 'data/emailLogs.json');

export function logEmailSend(user: { name: string; email: string; dob: string }) {
  const entry = {
    ...user,
    sentAt: new Date().toISOString()
  };
  let logs = [];
  if (fs.existsSync(LOG_PATH)) {
    logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
  }
  logs.unshift(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

export function getTodayEmailCount(): number {
  if (!fs.existsSync(LOG_PATH)) return 0;
  const logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  return logs.filter((log: any) => log.sentAt.startsWith(today)).length;
}

export function getLogs(limit = 50) {
  if (!fs.existsSync(LOG_PATH)) return [];
  const logs = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
  return logs.slice(0, limit);
}
