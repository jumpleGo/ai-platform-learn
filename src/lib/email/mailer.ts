import 'server-only';
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT) || 2525;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error('SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM) are not configured');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendMailParams): Promise<boolean> {
  try {
    const mail = getTransporter();
    const info = await mail.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
    console.log(`✉️ Email successfully sent to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return false;
  }
}

export async function sendPaymentSuccessEmail({
  to,
  planName,
  periodDays,
}: {
  to: string;
  planName: string;
  periodDays: number;
}): Promise<boolean> {
  const daysText = periodDays === 365 ? '1 год' : `${periodDays} дней`;
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f1; margin: 0; padding: 24px; color: #1e1e24; }
    .container { max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 36px 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); }
    .header { text-align: center; margin-bottom: 28px; }
    .title { font-size: 24px; font-weight: 800; color: #121826; margin: 12px 0 6px; }
    .subtitle { font-size: 16px; color: #4b5563; line-height: 1.5; margin: 0; }
    .box { background-color: #f9f8f4; border: 1px solid #eae7dc; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 15px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #6b7280; }
    .value { font-weight: 600; color: #111827; }
    .btn { display: inline-block; width: 100%; text-align: center; background-color: #f59e0b; color: #000000; text-decoration: none; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 12px; box-sizing: border-box; margin-top: 8px; }
    .footer { text-align: center; margin-top: 32px; font-size: 13px; color: #9ca3af; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="font-size: 40px; line-height: 1;">🍦</div>
      <h1 class="title">Доступ успешно открыт!</h1>
      <p class="subtitle">Спасибо за доверие! Все платные уроки и материалы теперь доступны на платформе Gelato.</p>
    </div>

    <div class="box">
      <div class="row">
        <span class="label">Тариф:</span>
        <span class="value">${planName}</span>
      </div>
      <div class="row">
        <span class="label">Срок доступа:</span>
        <span class="value">${daysText}</span>
      </div>
      <div class="row">
        <span class="label">Аккаунт:</span>
        <span class="value">${to}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="https://gelato.education/login" class="btn" style="color: #000000;">
        Войти и начать обучение →
      </a>
    </div>

    <div class="footer">
      <p>Если у вас возникнут вопросы или потребуется помощь, просто ответьте на это письмо или напишите нам в Telegram.</p>
      <p>© Gelato — Школа ИИ</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to,
    subject: '🍦 Доступ к обучению Gelato успешно открыт!',
    html,
  });
}
