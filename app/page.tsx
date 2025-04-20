"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface User {
  name: string;
  dob: string;
  email: string;
}

interface Log {
  name: string;
  email: string;
  dob: string;
  sentAt: string;
}

// Client-only date formatter to prevent hydration errors
function ClientDate({ dateString }: { dateString: string }) {
  const [formatted, setFormatted] = useState(dateString);
  useEffect(() => {
    setFormatted(new Date(dateString).toLocaleString());
  }, [dateString]);
  return <>{formatted}</>;
}

export default function DashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [today, setToday] = useState('');
  const [usersWithBirthday, setUsersWithBirthday] = useState<User[]>([]);
  const [emailsSentToday, setEmailsSentToday] = useState(0);
  const [logs, setLogs] = useState<Log[]>([]);

  // Auto-trigger /api/init on first load
  useEffect(() => {
    fetch('/api/init').catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users);
        setToday(data.today);
        setUsersWithBirthday(data.usersWithBirthday);
        setEmailsSentToday(data.emailsSentToday);
        setLogs(data.logs);
      });
  }, []);

  // Get list of emails already sent today
  const emailedToday = new Set(logs.map(log => log.email));

  // Handler for clearing logs
  const handleClearLogs = async () => {
    await fetch('/api/logs', { method: 'DELETE' });
    // Re-fetch dashboard data to update UI
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users);
        setToday(data.today);
        setUsersWithBirthday(data.usersWithBirthday);
        setEmailsSentToday(data.emailsSentToday);
        setLogs(data.logs);
      });
  };

  // Handler for refreshing logs
  const handleRefreshLogs = async () => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users);
        setToday(data.today);
        setUsersWithBirthday(data.usersWithBirthday);
        setEmailsSentToday(data.emailsSentToday);
        setLogs(data.logs);
      });
  };

  return (
    <main className="max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Birthday Notifier Dashboard</h1>
      <section className="mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold">Users</span>
              <Badge variant="secondary">{users.length} users</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="max-h-72 overflow-y-auto">
              {users.map(user => {
                const isBirthday = usersWithBirthday.some(u => u.email === user.email);
                const alreadyEmailed = emailedToday.has(user.email);
                return (
                  <li key={user.email} className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isBirthday && !alreadyEmailed ? 'bg-yellow-100 dark:bg-yellow-900' : ''}`}>
                    <span className="font-medium">{user.name}</span>
                    <span>{user.dob}</span>
                    {isBirthday && !alreadyEmailed && <Badge className="ml-2" variant="destructive">Birthday Today!</Badge>}
                    {isBirthday && alreadyEmailed && <Badge className="ml-2" variant="secondary">Already Emailed</Badge>}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>
      <section className="mb-8">
        <Card>
          <CardHeader>
            <span className="text-xl font-semibold">Dashboard</span>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div>Today's date: <span className="font-mono">{today}</span></div>
              <div>Emails sent today: <Badge variant="outline">{emailsSentToday}</Badge></div>
            </div>
          </CardContent>
        </Card>
      </section>
      <section>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="text-xl font-semibold">Birthday Wish Logs</span>
            <div>
              <button
                onClick={handleRefreshLogs}
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Refresh Logs
              </button>
              <button
                onClick={handleClearLogs}
                className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Clear Logs
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="max-h-72 overflow-y-auto">
              {logs.length === 0 && <li className="text-gray-500">No logs yet.</li>}
              {logs.map((log, idx) => (
                <li key={idx} className="py-2 border-b last:border-b-0 flex flex-col">
                  <span><b>{log.name}</b> ({log.email})</span>
                  <span className="text-xs text-gray-500">Birthday: {log.dob} | Sent at: <ClientDate dateString={log.sentAt} /></span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
