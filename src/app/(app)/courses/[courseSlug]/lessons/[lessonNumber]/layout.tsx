import { notFound } from 'next/navigation';
import { resolveLesson } from '@/lib/db/courses';

// Проверка должна оставаться выше ВСЕХ родительских loading.tsx: скелетон главной
// ограничен группой (home), а loading.tsx урока находится ниже этого layout.
// resolveLesson обёрнут в cache() — страница урока повторно в Firestore не ходит.
export default async function LessonSegmentLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ courseSlug: string; lessonNumber: string }>;
}) {
  const { courseSlug, lessonNumber } = await params;
  if (!(await resolveLesson(courseSlug, lessonNumber))) notFound();
  return children;
}
