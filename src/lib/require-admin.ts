import 'server-only';
import { getSession } from '@/lib/session';

// Вторая линия защиты для server actions (первая — admin/layout.tsx)
export async function requireAdmin() {
  const session = await getSession();
  // role приходит из custom claims, DecodedIdToken не знает это поле
  if ((session as { role?: string } | null)?.role !== 'admin') throw new Error('forbidden');
  return session!;
}
