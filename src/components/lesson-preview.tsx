'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { youtubePreviewSrc, youtubeThumb } from '@/lib/video-url';

// Превью урока: своя обложка либо кадр из ролика + тихий автоплей при наведении
// (только YouTube, на устройствах с мышью). Если показывать нечего — «терминальный» вид.
export function LessonPreview({
  id,
  num,
  title,
  previewUrl,
}: {
  id: string | null;
  num: string;
  title: string;
  previewUrl?: string | null;
}) {
  const [canPreview, setCanPreview] = useState(false);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setCanPreview(fine && !reduce);
  }, []);

  const thumb = previewUrl || (id ? youtubeThumb(id) : null);
  const isYtThumb = !previewUrl && !!id; // кадр YouTube 4:3 — подрезаем масштабом
  const canPlay = canPreview && !!id; // ховер-превью только для YouTube

  function enter() {
    if (!canPlay) return;
    timer.current = setTimeout(() => setPlaying(true), 320); // не грузим при быстром проведении мышью
  }
  function leave() {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(false);
  }

  if (!thumb) {
    // Запасной вид — окно терминала (тематика Claude Code)
    return (
      <>
        <div className="flex h-6 items-center gap-1.5 border-b border-border/70 bg-secondary px-2.5">
          <span className="size-2 rounded-full bg-destructive/50" aria-hidden />
          <span className="size-2 rounded-full bg-chart-2/60" aria-hidden />
          <span className="size-2 rounded-full bg-chart-3/60" aria-hidden />
          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">lesson_{num}</span>
        </div>
        <div className="flex h-[calc(100%-1.5rem)] flex-col justify-between p-3">
          <p className="font-mono text-xs text-muted-foreground">
            <span className="text-primary">❯</span> claude run
          </p>
          <div className="flex items-center justify-between">
            <span className="font-heading text-3xl font-semibold text-foreground/15 transition-colors duration-200 group-hover:text-foreground/25">
              {num}
            </span>
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-sm transition-all duration-200 group-hover:opacity-100 motion-reduce:opacity-100">
              <Play className="size-4 fill-current" aria-hidden />
            </span>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="absolute inset-0 bg-black" onMouseEnter={enter} onMouseLeave={leave}>
      <img
        src={thumb}
        alt=""
        loading="lazy"
        className={`size-full object-cover transition-transform duration-300 ${
          isYtThumb ? 'scale-[1.35] group-hover:scale-[1.4]' : 'group-hover:scale-105'
        }`}
      />
      {playing && id && (
        <iframe
          src={youtubePreviewSrc(id)}
          title={title}
          tabIndex={-1}
          aria-hidden
          // pointer-events-none — клики уходят в карточку-ссылку, не в плеер
          className="animate-fade pointer-events-none absolute inset-0 size-full scale-[1.35]"
          allow="autoplay; encrypted-media"
        />
      )}
      {/* затемнение снизу + кнопка play до старта превью */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden />
      <span
        className={`pointer-events-none absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-all duration-200 ${
          playing ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 motion-reduce:opacity-100'
        }`}
        aria-hidden
      >
        <Play className="size-4 fill-current" />
      </span>
    </div>
  );
}
