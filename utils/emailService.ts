import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export async function sendBirthdayEmail(to: string, name: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Happy Birthday, ${name}! 🎉`,
    html: `<div style="font-family:sans-serif;padding:20px;background:#f7fafc;border-radius:8px;">
      <h2 style="color:#6366f1;">Happy Birthday, ${name}!</h2>
      <p>Wishing you a fantastic year ahead. Enjoy your special day! 🎂🥳</p>
      <hr style="margin:20px 0;"/>
      <small>This is an automated birthday wish from the Birthday Notifier App.</small>
    </div>`
  };

  return transporter.sendMail(mailOptions);
}
