'use client';
import { useEffect, useRef, useState } from 'react';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

// iframe указывает на наш прокси-роут, а не на YouTube — id ролика не попадает
// ни в исходник страницы, ни в RSC-пейлоад. Контекстное меню по обёртке отключено.
export function VideoEmbed({ courseId, lessonId, title, analyticsLessonId }: {
  courseId: string;
  lessonId: string;
  title: string;
  analyticsLessonId?: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const tracked = useRef(new Set<string>());

  useEffect(() => {
    // псевдо-fullscreen: плеер внутри iframe просит растянуть сам iframe на весь экран —
    // нативный requestFullscreen на div во вложенном iframe на мобилке часто не работает
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.source !== 'lessonPlayer') return;
      if (e.data.type === 'fullscreen') {
        setFullscreen(Boolean(e.data.fullscreen));
        return;
      }
      if (!analyticsLessonId || e.data.type !== 'analytics') return;
      const event = String(e.data.event ?? '');
      if (tracked.current.has(event)) return;
      const eventNames: Record<string, string> = {
        video_start: EVENTS.videoStarted,
        video_25: EVENTS.video25,
        video_50: EVENTS.video50,
        video_75: EVENTS.video75,
        video_90: EVENTS.video90,
        video_complete: EVENTS.videoCompleted,
      };
      const name = eventNames[event];
      if (!name) return;
      tracked.current.add(event);
      track(name, {
        lesson_id: analyticsLessonId,
        ...(typeof e.data.progress === 'number' ? { progress: e.data.progress } : {}),
      });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [analyticsLessonId]);

  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullscreen]);

  // Псевдо-фуллскрин не должен оживать при переходах по истории: на «назад»/«вперёд»
  // и на восстановлении страницы гасим его и говорим плееру сбросить свой fakeFs,
  // иначе состояния родителя и плеера разъезжаются и кнопка начинает работать наоборот.
  useEffect(() => {
    function exitFullscreen() {
      setFullscreen(false);
      iframeRef.current?.contentWindow?.postMessage(
        { source: 'lessonHost', type: 'exitFullscreen' },
        window.location.origin,
      );
    }
    window.addEventListener('popstate', exitFullscreen);
    window.addEventListener('pageshow', exitFullscreen);
    return () => {
      window.removeEventListener('popstate', exitFullscreen);
      window.removeEventListener('pageshow', exitFullscreen);
    };
  }, []);

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
        loading="lazy"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      />
    </div>
  );
}
