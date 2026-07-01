'use client';
import { useEffect, useRef, useState } from 'react';

// iframe указывает на наш прокси-роут, а не на YouTube — id ролика не попадает
// ни в исходник страницы, ни в RSC-пейлоад. Контекстное меню по обёртке отключено.
export function VideoEmbed({ courseId, lessonId, title }: {
  courseId: string;
  lessonId: string;
  title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    // псевдо-fullscreen: плеер внутри iframe просит растянуть сам iframe на весь экран —
    // нативный requestFullscreen на div во вложенном iframe на мобилке часто не работает
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.source !== 'lessonPlayer') return;
      setFullscreen(Boolean(e.data.fullscreen));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullscreen]);

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-black'
          : 'aspect-video w-full overflow-hidden rounded-lg bg-black'
      }
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        src={`/api/player/${courseId}/${lessonId}`}
        title={title}
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      />
    </div>
  );
}
