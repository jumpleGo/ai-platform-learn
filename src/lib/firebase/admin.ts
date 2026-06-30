import 'server-only';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getOrCreateApp(): App {
  if (getApps().length > 0) return getApps()[0];
  if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
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

// Прокси-объекты: SDK инициализируется при первом реальном вызове, не при импорте
function lazy<T extends object>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const instance = getter();
      const value = (instance as any)[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
  });
}

export const adminAuth = lazy(() => getAuth(getOrCreateApp()));
export const adminDb = lazy(() => getFirestore(getOrCreateApp()));
export const adminStorage = lazy(() => getStorage(getOrCreateApp()));

export const storageBucketName =
  process.env.FIREBASE_STORAGE_BUCKET ??
  `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`;
