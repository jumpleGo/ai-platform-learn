import 'server-only';
import { cache } from 'react';
import { listPublishedReels } from '@/lib/db/reels';

// Share one result across the page, both menus and footer within this request.
export const hasPublishedReels = cache(async (): Promise<boolean> => {
  try {
    return (await listPublishedReels()).length > 0;
  } catch {
    return false;
  }
});
