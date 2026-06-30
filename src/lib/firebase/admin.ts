import 'server-only';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function createApp(): App {
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
    // в режиме эмулятора service account не нужен — admin SDK сам видит эти env
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    return initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
  return initializeApp({
    credential: cert(JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64!, 'base64').toString()
    )),
  });
}

const app = getApps()[0] ?? createApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);

// Бакет для загрузок: явный из env или дефолтный для проекта
export const storageBucketName =
  process.env.FIREBASE_STORAGE_BUCKET ??
  `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
