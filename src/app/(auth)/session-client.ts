import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';
import { identify } from '@/lib/analytics/track-client';
import { ensureUserProfile } from './actions';

// Обменивает idToken пользователя на httpOnly session cookie
export async function exchangeIdTokenForSession(idToken: string) {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error('Не удалось создать сессию');
  const uid = clientAuth.currentUser?.uid;
  if (uid) identify(uid);
}

// Общий обработчик входа через Google: popup → сессия → профиль
export async function signInWithGoogleAndSession() {
  const cred = await signInWithPopup(clientAuth, new GoogleAuthProvider());
  const idToken = await cred.user.getIdToken();
  await exchangeIdTokenForSession(idToken);
  await ensureUserProfile(idToken);
}

// Переводит коды ошибок Firebase Auth в сообщения на русском
export function authErrorMessage(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';
  switch (code) {
    case 'auth/invalid-credential':
      return 'Неверная почта или пароль';
    case 'auth/email-already-in-use':
      return 'Эта почта уже зарегистрирована';
    case 'auth/weak-password':
      return 'Пароль слишком короткий (минимум 6 символов)';
    case 'auth/popup-closed-by-user':
      return 'Окно входа закрыто';
    default:
      return 'Не удалось выполнить вход. Попробуйте ещё раз';
  }
}
