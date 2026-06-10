import type { User } from 'firebase/auth';

// Обменивает idToken пользователя на httpOnly session cookie
export async function exchangeIdTokenForSession(user: User) {
  const idToken = await user.getIdToken();
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error('Не удалось создать сессию');
}
