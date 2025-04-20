# Birthday Notifier App

This app automatically sends birthday emails to users listed in `data/users.json` every day at 9 AM (Asia/Kolkata timezone).

## Features
- Automated birthday email notifications using cron jobs
- Modern dashboard UI (Next.js, shadcn/ui, Tailwind CSS)
- Logs of sent birthday wishes
- Server-side rendering

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your email credentials.

3. **Run the app:**
   ```bash
   npm run dev
   ```
   The app runs on [http://localhost:3000](http://localhost:3000)

4. **Start the cron job:**
   - Visit `/api/init` once after starting the dev server to initialize the birthday cron job.

## File Structure
- `data/users.json` — User data
- `utils/emailService.ts` — Email sending logic
- `utils/cronService.ts` — Cron scheduling
- `utils/logger.ts` — Logging sent emails
- `app/page.tsx` — Dashboard UI
- `app/api/init/route.ts` — Starts cron job
- `app/api/dashboard/route.ts` — Dashboard data API
- `app/api/logs/route.ts` — Logs API

## Styling
- Uses Tailwind CSS and shadcn/ui

## Notes
- Make sure to use an app password for Gmail or your provider's SMTP credentials.
- Do not expose secrets in your code or frontend.
