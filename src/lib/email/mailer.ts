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

/**
 * Письмо для тарифов без поддержки («Самостоятельно»):
 * Доступ открыт сразу, высылаем логин, пароль (если аккаунт создан) и ссылку на вход.
 */
export async function sendSelfPacedAccessEmail({
  to,
  planName,
  periodDays,
  password,
  isNewAccount,
}: {
  to: string;
  planName: string;
  periodDays: number;
  password?: string | null;
  isNewAccount?: boolean;
}): Promise<boolean> {
  const daysText = periodDays === 365 ? '1 год' : `${periodDays} дней`;
  const loginUrl = `https://gelato.education/login?email=${encodeURIComponent(to)}`;

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Доступ к обучению Gelato открыт</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; margin: 0; padding: 32px 16px; color: #1e1e24; }
    .wrapper { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 2px solid #102647; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 0 0 #102647; }
    .header { background-color: #fff9e6; border-bottom: 2px solid #102647; padding: 32px 28px; text-align: center; }
    .logo-badge { display: inline-block; font-size: 38px; line-height: 1; margin-bottom: 8px; }
    .title { font-size: 26px; font-weight: 900; color: #102647; margin: 8px 0 4px; letter-spacing: -0.02em; }
    .subtitle { font-size: 15px; color: #475569; margin: 0; font-weight: 500; }
    .content { padding: 32px 28px; }
    .box { background-color: #fbf9f4; border: 2px solid #102647; border-radius: 14px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; font-size: 15px; border-bottom: 1px dashed #e2ded4; padding-bottom: 8px; }
    .row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
    .label { color: #64748b; font-weight: 600; font-size: 14px; }
    .value { font-weight: 700; color: #102647; text-align: right; }
    .pwd-badge { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 16px; font-weight: 800; background-color: #fef08a; padding: 3px 8px; border-radius: 6px; border: 1px dashed #ca8a04; color: #102647; letter-spacing: 0.5px; }
    .note { font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0 24px; }
    .btn { display: block; text-align: center; background-color: #102647; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 16px; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 0 0 #f59e0b; transition: all 0.2s; }
    .footer { text-align: center; padding: 24px; background-color: #fbf9f4; border-top: 1px solid #eeebe2; font-size: 13px; color: #94a3b8; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">🍦</div>
      <h1 class="title">Доступ успешно открыт!</h1>
      <p class="subtitle">Все платные уроки и исходники уже ждут вас на платформе Gelato.</p>
    </div>

    <div class="content">
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
          <span class="label">Логин (Email):</span>
          <span class="value">${to}</span>
        </div>
        ${
          password
            ? `
        <div class="row">
          <span class="label">Пароль для входа:</span>
          <span class="value"><span class="pwd-badge">${password}</span></span>
        </div>`
            : ''
        }
      </div>

      <p class="note">
        ${
          isNewAccount && password
            ? '💡 Мы создали для вас личный кабинет. Вы можете войти по указанному паролю или через Google (если почта привязана к аккаунту Google). Сменить пароль можно в профиле в любой момент.'
            : '💡 Доступ привязан к вашему аккаунту. Войдите со своим текущим паролем или через Google.'
        }
      </p>

      <a href="${loginUrl}" class="btn">
        Войти и начать обучение →
      </a>
    </div>

    <div class="footer">
      <p>Если возникнут вопросы или потребуется помощь, просто ответьте на это письмо или напишите в Telegram <strong>@gelato_ai</strong>.</p>
      <p>© GELATO — Маленькая школа ИИ</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to,
    subject: `🍦 Доступ к обучению открыт: ${planName}`,
    html,
  });
}

/**
 * Письмо для тарифов с поддержкой («Поток с сопровождением»):
 * Подтверждаем оплату места, фиксируем Telegram, указываем дату старта (14 сентября)
 * и сообщаем, что свяжемся в Telegram перед стартом.
 */
export async function sendSupportStreamEnrollmentEmail({
  to,
  planName,
  startDate = '14 сентября',
  telegram,
}: {
  to: string;
  planName: string;
  startDate?: string;
  telegram?: string | null;
}): Promise<boolean> {
  const tgDisplay = telegram ? telegram : 'уточним при связи';

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Вы записаны на поток с поддержкой</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f5f0; margin: 0; padding: 32px 16px; color: #1e1e24; }
    .wrapper { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 2px solid #102647; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 0 0 #102647; }
    .header { background-color: #ecfdf5; border-bottom: 2px solid #102647; padding: 32px 28px; text-align: center; }
    .logo-badge { display: inline-block; font-size: 38px; line-height: 1; margin-bottom: 8px; }
    .title { font-size: 25px; font-weight: 900; color: #102647; margin: 8px 0 4px; letter-spacing: -0.02em; }
    .subtitle { font-size: 15px; color: #065f46; margin: 0; font-weight: 600; }
    .content { padding: 32px 28px; }
    .box { background-color: #fbf9f4; border: 2px solid #102647; border-radius: 14px; padding: 20px; margin: 20px 0; }
    .row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; font-size: 15px; border-bottom: 1px dashed #e2ded4; padding-bottom: 8px; }
    .row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
    .label { color: #64748b; font-weight: 600; font-size: 14px; }
    .value { font-weight: 700; color: #102647; text-align: right; }
    .highlight { color: #e11d48; font-weight: 800; font-size: 16px; }
    .timeline-card { background-color: #fff9e6; border: 2px dashed #f59e0b; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .timeline-title { font-size: 15px; font-weight: 800; color: #102647; margin: 0 0 10px; }
    .timeline-list { margin: 0; padding-left: 18px; font-size: 14px; color: #334155; line-height: 1.6; }
    .btn { display: block; text-align: center; background-color: #102647; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 16px; padding: 16px 24px; border-radius: 12px; box-shadow: 0 4px 0 0 #10b981; }
    .footer { text-align: center; padding: 24px; background-color: #fbf9f4; border-top: 1px solid #eeebe2; font-size: 13px; color: #94a3b8; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">🍦</div>
      <h1 class="title">Место на потоке забронировано!</h1>
      <p class="subtitle">Оплата прошла успешно. Мы свяжемся с вами в Telegram.</p>
    </div>

    <div class="content">
      <div class="box">
        <div class="row">
          <span class="label">Курс:</span>
          <span class="value">${planName}</span>
        </div>
        <div class="row">
          <span class="label">Формат:</span>
          <span class="value">С личной поддержкой Эмиля</span>
        </div>
        <div class="row">
          <span class="label">Старт потока:</span>
          <span class="value"><span class="highlight">${startDate}</span></span>
        </div>
        <div class="row">
          <span class="label">Ваш Telegram:</span>
          <span class="value">${tgDisplay}</span>
        </div>
        <div class="row">
          <span class="label">Email:</span>
          <span class="value">${to}</span>
        </div>
      </div>

      <div class="timeline-card">
        <div class="timeline-title">📣 Как пройдёт запуск:</div>
        <ol class="timeline-list">
          <li>Перед стартом (<strong>${startDate}</strong>) мы напишем вам в Telegram и добавим в закрытый чат участников потока.</li>
          <li>В день старта мы откроем доступ на платформе ко всем урокам и материалам.</li>
          <li>В подарок включён 1 месяц <strong>Claude Pro</strong> — докупать ничего не нужно.</li>
        </ol>
      </div>

      <a href="https://t.me/gelato_ai" class="btn">
        Написать в Telegram @gelato_ai →
      </a>
    </div>

    <div class="footer">
      <p>Если у вас изменился Telegram или есть срочный вопрос, напишите нам в Telegram <strong>@gelato_ai</strong>.</p>
      <p>© GELATO — Маленькая школа ИИ</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to,
    subject: `🍦 Вы записаны на поток: ${planName} (старт ${startDate})`,
    html,
  });
}

/**
 * Обратная совместимость для существующих вызовов.
 */
export async function sendPaymentSuccessEmail(params: {
  to: string;
  planName: string;
  periodDays: number;
}): Promise<boolean> {
  return sendSelfPacedAccessEmail(params);
}

