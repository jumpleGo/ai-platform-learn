// Назначение администратора: npx tsx scripts/make-admin.ts user@example.com
// admin.ts не импортируем из-за 'server-only' — инициализация продублирована намеренно.
process.loadEnvFile('.env.local');

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function createApp(): App {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
  return initializeApp({
    credential: cert(JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString()
    )),
  });
}

const email = process.argv[2];
if (!email) {
  console.error('Использование: npx tsx scripts/make-admin.ts <email>');
  process.exit(1);
}

const app = getApps()[0] ?? createApp();

async function main() {
  const auth = getAuth(app);
  const db = getFirestore(app);
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: 'admin' });
  await db.doc(`users/${user.uid}`).set({ role: 'admin' }, { merge: true });
  console.log(`admin: ${email} (${user.uid})`);
  console.log('Роль попадёт в session cookie только после повторного входа пользователя.');
}

// tsx исполняет .ts как CJS — top-level await недоступен
main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
