import Link from 'next/link';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import { LockBadge } from './lock-badge';
import { LessonPreview } from './lesson-preview';
import { formatCount } from '@/lib/utils';
import { trackTestCourseClick } from '@/app/(app)/actions';
import { lessonPath, waitlistPath } from '@/lib/slug';

// Безопасный набор полей для карточки: без videoEmbedUrl и materials.
// videoId задаётся только для доступных уроков; для заблокированных — null
// (тогда нет кадра из видео и ховер-превью, id ролика не раскрывается).
export type LessonCardData = {
  id: string;
  courseId: string;
  // Ключ курса для URL (slug, у старых курсов — id)
  courseKey: string;
  // Номер урока в курсе — сегмент URL и подпись на обложке
  number: number;
  title: string;
  durationSec: number | null;
  views: number;
  previewImageUrl: string | null;
  videoId: string | null;
};

export function LessonCard({ lesson, index, locked, isTest, testToastMessage }: {
  lesson: LessonCardData;
  index: number;
  locked: boolean;
  // Курс-пустышка: клик ведёт на лендинг предзаписи вместо урока, с тостом
  isTest?: boolean;
  testToastMessage?: string | null;
}) {
  const num = String(lesson.number).padStart(2, '0');
  const views = lesson.views ?? 0;
  return (
    <Link
      href={isTest ? waitlistPath(lesson.courseKey) : lessonPath(lesson.courseKey, lesson.number)}
      onClick={isTest ? () => {
        toast(testToastMessage || 'Курс скоро откроется');
        // аналитика не должна ронять клик: устаревший id экшена после пересборки/деплоя
        // даёт unhandled rejection и всплывает ошибкой в UI
        void trackTestCourseClick(lesson.courseId).catch(() => {});
      } : undefined}
      className="group animate-float w-60 shrink-0 snap-start space-y-2.5"
      // лёгкий каскад появления карточек (ограничиваем, чтобы дальние не висели прозрачными)
      style={{ '--rise-delay': `${Math.min(index, 6) * 0.05}s` } as React.CSSProperties}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-md">
        <LessonPreview id={lesson.videoId} num={num} previewUrl={lesson.previewImageUrl} />
        {locked && <LockBadge />}
      </div>
      <div className="space-y-0.5 px-0.5">
        <p className="line-clamp-2 text-sm font-medium transition-colors duration-200 group-hover:text-primary">
          {lesson.title}
        </p>
        <div className="flex items-center gap-2.5 font-mono text-xs text-muted-foreground">
          {lesson.durationSec !== null && (
            <span>{Math.max(1, Math.round(lesson.durationSec / 60))} мин</span>
          )}
          {views > 0 && (
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" aria-hidden />
              {formatCount(views)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
