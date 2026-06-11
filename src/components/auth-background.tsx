'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { LoginScene } from '@/remotion/login-scene';

// Player трогает window — грузим только на клиенте
const Player = dynamic(() => import('@remotion/player').then((m) => m.Player), {
  ssr: false,
});

// Декоративный фон не должен рушить страницу: любой сбой плеера гасим тихо
class SafeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Анимированный фон Remotion на страницах входа и регистрации (десктоп и мобайл).
export function AuthBackground() {
  const pathname = usePathname();
  // монтируем только на клиенте и уважаем prefers-reduced-motion
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (pathname !== '/login' && pathname !== '/register') return null;
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <SafeBoundary>
        {/* cover: ландшафтную сцену (3:2) растягиваем на весь экран в любой ориентации */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'max(100%, calc(100dvh * 1.5))',
            height: 'max(100%, calc(100dvw / 1.5))',
          }}
        >
          <Player
            component={LoginScene}
            durationInFrames={480}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1280}
            loop
            autoPlay
            controls={false}
            clickToPlay={false}
            doubleClickToFullscreen={false}
            spaceKeyToPlayOrPause={false}
            initiallyMuted
            acknowledgeRemotionLicense
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </SafeBoundary>
      {/* лёгкая вуаль, чтобы карточка формы оставалась читаемой */}
      <div className="absolute inset-0 bg-background/30" />
    </div>
  );
}
