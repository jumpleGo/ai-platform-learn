import { Suspense } from 'react';
import { PartnerBar } from '@/components/partner-bar';
import { AuthBackground } from '@/components/auth-background';
import { GelatoLogo } from '@/components/gelato-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <PartnerBar />
      </Suspense>
      <div className="bg-hero-glow relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden p-4">
        <AuthBackground />
        <div className="animate-rise relative z-10 flex items-center">
          <GelatoLogo className="h-14 sm:h-16" />
        </div>
        <div className="animate-rise relative z-10 w-full max-w-sm" style={{ '--rise-delay': '0.06s' } as React.CSSProperties}>
          {children}
        </div>
        <p className="animate-rise relative z-10 font-mono text-xs text-muted-foreground" style={{ '--rise-delay': '0.12s' } as React.CSSProperties}>
          $ обучение ИИ-разработке с Claude Code
        </p>
      </div>
    </div>
  );
}
