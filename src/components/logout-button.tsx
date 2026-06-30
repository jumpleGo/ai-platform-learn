'use client';

import { Button } from '@/components/ui/button';
import { clientAuth } from '@/lib/firebase/client';
import { resetAnalytics } from '@/lib/analytics/track-client';

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch('/api/auth/session', { method: 'DELETE' });
        // гасим клиентскую сессию Firebase и аналитику, чтобы следующий пользователь не унаследовал их
        await clientAuth.signOut();
        resetAnalytics();
        // полный переход вместо router.push+refresh: страница рвётся целиком, поэтому
        // префетченные защищённые ссылки не штормят редиректами на /login (RSC payload errors)
        window.location.assign('/login');
      }}
    >
      Выйти
    </Button>
  );
}
