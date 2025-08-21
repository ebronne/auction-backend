// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true', // false for port 587 (STARTTLS), true only for 465
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});


async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_FROM) throw new Error('Missing SMTP_FROM');
  return transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
}

module.exports = { sendMail, transporter };
