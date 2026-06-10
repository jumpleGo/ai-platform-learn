import { initializeApp, getApps } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const app = getApps()[0] ?? initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'demo-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'localhost',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});

export const clientAuth = getAuth(app);

// в режиме эмулятора подключаемся к локальному Auth; флаг в globalThis защищает от повторного connect при HMR
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === '1') {
  const g = globalThis as { __authEmulator?: boolean };
  if (!g.__authEmulator) {
    connectAuthEmulator(clientAuth, 'http://127.0.0.1:9099', { disableWarnings: true });
    g.__authEmulator = true;
  }
}
