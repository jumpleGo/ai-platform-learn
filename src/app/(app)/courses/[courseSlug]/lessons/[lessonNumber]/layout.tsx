import { notFound } from 'next/navigation';
import { resolveLesson } from '@/lib/db/courses';

// Layout сегмента стоит выше loading.tsx (Suspense-границы страницы урока), поэтому notFound() здесь
// срабатывает до начала стриминга и отдаёт настоящий HTTP 404, а не soft-404 со статусом 200.
// resolveLesson обёрнут в cache() — страница урока повторно в Firestore не ходит.
export default async function LessonSegmentLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ courseSlug: string; lessonNumber: string }>;
}) {
  const { courseSlug, lessonNumber } = await params;
  if (!(await resolveLesson(courseSlug, lessonNumber))) notFound();
  return children;
}
