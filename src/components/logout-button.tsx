'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { clientAuth } from '@/lib/firebase/client';
import { resetAnalytics } from '@/lib/analytics/track-client';

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await fetch('/api/auth/session', { method: 'DELETE' });
        // гасим клиентскую сессию Firebase и аналитику, чтобы следующий пользователь не унаследовал их
        await clientAuth.signOut();
        resetAnalytics();
        router.push('/login');
        router.refresh();
      }}
    >
      Выйти
    </Button>
  );
}
