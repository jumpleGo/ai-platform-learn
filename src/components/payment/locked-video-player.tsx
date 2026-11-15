'use client';

import { Lock, Sparkles } from 'lucide-react';
import { usePaymentModal } from '@/components/payment/payment-modal-context';

interface LockedVideoPlayerProps {
  previewUrl: string | null;
  title: string;
  courseSlug?: string;
  courseTitle?: string;
}

export function LockedVideoPlayer({
  previewUrl,
  title,
  courseSlug,
  courseTitle,
}: LockedVideoPlayerProps) {
  const { openPaymentModal } = usePaymentModal();

  const handleOpen = () => {
    openPaymentModal({ courseSlug, courseTitle });
  };

  return (
    <div
      onClick={handleOpen}
      className="group relative aspect-video w-full bg-black overflow-hidden cursor-pointer select-none"
      role="button"
      tabIndex={0}
      aria-label="Открыть оплату для доступа к видео"
    >
      {previewUrl && (
        <img
          src={previewUrl}
          alt={title}
          className="size-full object-cover opacity-40 transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center p-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/20 border border-primary/40 text-primary transition-all duration-200 group-hover:scale-110 group-hover:bg-primary/30">
          <Lock className="size-6 text-primary" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="px-6 text-base font-heading font-extrabold text-white">
            Видео доступно по подписке
          </p>
          <p className="text-xs text-white/75">
            Нажмите, чтобы открыть доступ к уроку
          </p>
        </div>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow transition-transform duration-200 group-hover:-translate-y-0.5"
        >
          <Sparkles className="size-3.5" />
          <span>Получить доступ</span>
        </button>
      </div>
    </div>
  );
}
