import { hasPublishedReels } from '@/lib/reels-availability';
import { SiteNavDesktopClient, SiteNavMobileClient } from '@/components/site-nav-client';

export async function SiteNavDesktop({ authed }: { authed: boolean }) {
  const hasReels = await hasPublishedReels();
  return <SiteNavDesktopClient authed={authed} hasReels={hasReels} />;
}

export async function SiteNavMobile({ authed, children }: { authed: boolean; children?: React.ReactNode }) {
  const hasReels = await hasPublishedReels();
  return <SiteNavMobileClient authed={authed} hasReels={hasReels}>{children}</SiteNavMobileClient>;
}
