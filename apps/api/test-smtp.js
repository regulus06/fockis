require('dotenv').config();
const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
console.log('Host:', process.env.SMTP_HOST, 'Port:', process.env.SMTP_PORT);
console.log('User:', JSON.stringify(process.env.SMTP_USER));
console.log('Pass length:', (process.env.SMTP_PASS || '').length);
t.verify().then(() => console.log('SMTP login OK')).catch(e => console.error('SMTP failed:', e.message));
