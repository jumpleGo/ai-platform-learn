import { Suspense } from 'react';
import { PartnerBar } from '@/components/partner-bar';
import { AuthBackground } from '@/components/auth-background';
import { DoodleScatter } from '@/components/doodle-decor';
import { GelatoLogo } from '@/components/gelato-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Suspense fallback={null}>
        <PartnerBar />
      </Suspense>
      <div className="bg-hero-glow relative flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden p-4">
        <AuthBackground />
        <DoodleScatter
          glyph="paisley"
          color="oklch(0.7 0.14 240)"
          className="top-4 left-4 h-8 w-8 -rotate-3 opacity-60 sm:top-10 sm:left-10 sm:h-10 sm:w-10"
        />
        <DoodleScatter
          glyph="toonface"
          color="oklch(0.72 0.15 250)"
          className="bottom-6 right-6 h-8 w-8 rotate-3 opacity-60 sm:bottom-12 sm:right-12 sm:h-10 sm:w-10"
        />
        <DoodleScatter
          glyph="icecream"
          className="top-6 right-6 h-8 w-6 rotate-6 opacity-70 sm:top-14 sm:right-16 sm:h-10 sm:w-8"
        />
        <DoodleScatter
          glyph="starburst"
          color="oklch(0.78 0.16 85)"
          className="bottom-4 left-6 h-7 w-7 -rotate-6 opacity-55 sm:bottom-10 sm:left-16 sm:h-9 sm:w-9"
        />
        <DoodleScatter
          glyph="cone"
          color="oklch(0.68 0.14 250)"
          className="top-1/3 right-2 h-8 w-7 rotate-3 opacity-45 sm:right-6 sm:h-10 sm:w-9"
        />
        <div className="relative z-10 flex items-end gap-2.5 font-mono text-lg font-semibold tracking-tight animate-rise">
          <GelatoLogo className="size-9" />
          GELATO
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
