const nodemailer = require('nodemailer');
const MailSettings = require('../models/MailSettings');

const createTransporter = async () => {
  const settings = await MailSettings.findByPk(1);
  const smtpUser = String(settings?.smtpUser || '').trim();
  const smtpPass = String(settings?.smtpPass || '');
  const mailFrom = String(settings?.mailFrom || '').trim();
  if (!smtpUser || !smtpPass || !mailFrom) {
    throw new Error('Email service is not configured.');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true').toLowerCase() !== 'false',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  return { transporter, mailFrom };
};

const sendPasswordResetCode = async ({ to, code }) => {
  const appName = process.env.APP_NAME || 'NovaFXM';
  const { transporter, mailFrom } = await createTransporter();

  await transporter.sendMail({
    from: mailFrom,
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

const sendEmailVerificationCode = async ({ to, code }) => {
  const appName = process.env.APP_NAME || 'NovaFXM';
  const { transporter, mailFrom } = await createTransporter();

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: `${appName} email verification code`,
    text: `Your ${appName} verification code is ${code}. This code expires in 15 minutes.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Verify your ${appName} email</h2>
        <p>Enter this code to finish creating your account:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>This code expires in 15 minutes. If you did not create an account, you can ignore this email.</p>
      </div>
    `,
  });
};

module.exports = {
  sendPasswordResetCode,
  sendEmailVerificationCode,
};
