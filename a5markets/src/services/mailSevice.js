const nodemailer = require('nodemailer');

const requiredConfig = ['SMTP_USER', 'SMTP_PASS'];

const isMailConfigured = () => requiredConfig.every((key) => Boolean(process.env[key]));

const createTransporter = () => {
  if (!isMailConfigured()) {
    throw new Error('Email service is not configured.');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendPasswordResetCode = async ({ to, code }) => {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const appName = process.env.APP_NAME || 'NovaFXM';
  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: `${appName} password reset code`,
    text: `Your ${appName} password reset code is ${code}. This code expires in 15 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>${appName} password reset</h2>
        <p>Your password reset code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>This code expires in 15 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetCode,
};