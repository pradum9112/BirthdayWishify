import dbConnect from '@/utils/mongodb';
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

export async function GET() {
  await dbConnect();
  // Use India timezone for today
  const indiaDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
  const today = indiaDate;
  const users = await User.find({}).lean();
  const usersWithBirthday = users.filter((u: any) => isTodayBirthday(u.dob, today));
  const emailsSentToday = await EmailLog.countDocuments({ sentAt: { $regex: `^${today}` } });
  const logs = await EmailLog.find({}).sort({ sentAt: -1 }).limit(20).lean();
  return Response.json({ users, today, usersWithBirthday, emailsSentToday, logs });
}
