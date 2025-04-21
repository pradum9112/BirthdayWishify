"use client";
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface User {
  name: string;
  dob: string;
  email: string;
  sentAt?: string;
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
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
      });
  }, []);

  // Poll logs every 10 seconds for live updates
  useEffect(() => {
    let cancelled = false;
    const fetchLogs = () => {
      fetch('/api/logs')
        .then(res => res.json())
        .then(data => {
          // Deduplicate logs by email+sentAt
          const unique: Log[] = Array.from(
            new Map((data.logs as Log[]).map((log: Log) => [`${log.email}_${log.sentAt}`, log])).values()
          );
          setLogs(unique);
        });
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetch('/api/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
      });
  }, []);

  useEffect(() => {
    fetch('/api/birthday-cron/schedule')
      .then(async res => {
        if (!res.ok) {
          const data = await res.json();
          if (data?.error === 'limit_exceeded') {
            setToast({ type: 'error', message: data.message });
          }
        }
      })
      .catch(() => {});
  }, []);

  // Get list of emails already sent today
  const emailedToday = new Set([]);

  // Handler for refreshing logs
  const handleRefreshLogs = async () => {
    setLoading(true);
    setToast(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const [logsRes, usersRes] = await Promise.all([
        fetch('/api/logs'),
        fetch('/api/users')
      ]);
      if (!logsRes.ok || !usersRes.ok) throw new Error('Failed to fetch logs or users');
      const logsData = await logsRes.json();
      const usersData = await usersRes.json();
      setLogs(logsData.logs || []);
      setUsers(usersData.users || []);
      setToast({ type: 'success', message: 'Logs & users refreshed.' });
    } catch (err: any) {
      if (err?.message && err.message.includes('limit_exceeded')) {
        setToast({ type: 'error', message: 'Daily user sending limit exceeded. For more information on Gmail' });
      } else {
        setToast({ type: 'error', message: 'Failed to refresh logs.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler for clearing logs
  const handleClearLogs = async () => {
    if (!window.confirm('Are you sure you want to clear all logs? This action cannot be undone.')) return;
    setLoading(true);
    setToast(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to clear logs');
      setLogs([]);
      setEmailsSentToday(0); // Set email count to 0 after clearing logs
      setToast({ type: 'success', message: 'Logs cleared successfully.' });
    } catch (err) {
      setToast({ type: 'error', message: 'Failed to clear logs.' });
    } finally {
      setLoading(false);
    }
  };

  // Show toast for 5 seconds then auto-close
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
                return (
                  <li key={user.email} className={`flex items-center justify-between py-2 border-b last:border-b-0 ${isBirthday ? 'bg-yellow-100 dark:bg-yellow-900' : ''}`}>
                    <span className="font-medium">{user.name}</span>
                    <span>{user.dob}</span>
                    {isBirthday && <Badge className="ml-2" variant="destructive">Birthday Today!</Badge>}
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
                className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Logs'}
              </button>
              <button
                onClick={handleClearLogs}
                className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Clear Logs'}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="max-h-72 overflow-y-auto">
              {logs.length === 0 && <li className="text-gray-500">No logs yet.</li>}
              {logs.map((log, idx) => (
                <li key={idx} className="py-2 border-b last:border-b-0 flex flex-col">
                  <span><b>{log.name}</b> ({log.email})</span>
                  <span className="text-xs text-gray-500">Birthday: {log.dob}</span>
                  {log.sentAt && (
                    <span className="text-xs text-blue-700">
                      Sent at: <ClientDate dateString={log.sentAt} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
      {toast && (
        <div className={`fixed top-6 right-6 px-4 py-2 rounded shadow-lg z-50 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}
    </main>
  );
}
