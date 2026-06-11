import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Access, Lesson } from '@/lib/types';
import { getCourseWithLessons } from '@/lib/db/admin-courses';
import {
  createLesson, deleteCourse, deleteLesson, moveLesson, updateCourse, updateLesson,
} from '../actions';
import { ConfirmSubmitButton } from '../confirm-submit-button';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

// Общие поля формы урока (создание и редактирование)
function LessonFields({ idPrefix, lesson, courseAccess }: {
  idPrefix: string;
  lesson?: Lesson;
  courseAccess: Access;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Название</Label>
        <Input id={`${idPrefix}-title`} name="title" required defaultValue={lesson?.title} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-description`}>Описание</Label>
        <Input id={`${idPrefix}-description`} name="description" defaultValue={lesson?.description} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-video`}>Ссылка на видео</Label>
        <Input
          id={`${idPrefix}-video`}
          name="videoEmbedUrl"
          required
          pattern="https://.*"
          title="Ссылка должна начинаться с https://"
          placeholder="https://..."
          defaultValue={lesson?.videoEmbedUrl}
        />
        <p className="text-xs text-muted-foreground">
          Ссылка на YouTube (любой формат) или embed-ссылка видеохостинга
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-duration`}>Длительность, сек</Label>
          <Input
            id={`${idPrefix}-duration`}
            name="durationSec"
            type="number"
            min={0}
            className="w-32"
            defaultValue={lesson?.durationSec ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-access`}>Доступ</Label>
          <select
            id={`${idPrefix}-access`}
            name="access"
            className={selectClass}
            defaultValue={lesson?.access ?? courseAccess}
          >
            <option value="free">Бесплатный</option>
            <option value="paid">По подписке</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default async function AdminCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await getCourseWithLessons(courseId);
  if (!course) notFound();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{course.title}</h1>
        <Link href="/admin/courses" className="text-sm text-muted-foreground hover:underline">
          ← Все курсы
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Курс</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form action={updateCourse.bind(null, courseId)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-title">Название</Label>
              <Input id="course-title" name="title" required defaultValue={course.title} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-description">Описание</Label>
              <Input id="course-description" name="description" defaultValue={course.description} />
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-access">Доступ (по умолчанию для новых уроков)</Label>
                <select id="course-access" name="access" className={selectClass} defaultValue={course.access}>
                  <option value="free">Бесплатный</option>
                  <option value="paid">По подписке</option>
                </select>
              </div>
              <label className="flex h-8 items-center gap-2 text-sm">
                <input type="checkbox" name="published" defaultChecked={course.published} />
                Опубликован
              </label>
              <Button type="submit">Сохранить</Button>
            </div>
          </form>
          <form action={deleteCourse.bind(null, courseId)}>
            <ConfirmSubmitButton variant="destructive" message="Удалить курс вместе с уроками?">
              Удалить курс
            </ConfirmSubmitButton>
          </form>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Уроки</h2>
        {course.lessons.length === 0 && (
          <p className="text-sm text-muted-foreground">Уроков пока нет</p>
        )}
        {course.lessons.map((lesson) => (
          <div key={lesson.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{lesson.title}</span>
              <Badge variant="outline">
                {lesson.access === 'paid' ? 'По подписке' : 'Бесплатный'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {lesson.durationSec != null ? `${lesson.durationSec} сек` : 'без длительности'}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <form action={moveLesson.bind(null, courseId, lesson.id, 'up')}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Вверх">
                    <ChevronUp />
                  </Button>
                </form>
                <form action={moveLesson.bind(null, courseId, lesson.id, 'down')}>
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Вниз">
                    <ChevronDown />
                  </Button>
                </form>
                <form action={deleteLesson.bind(null, courseId, lesson.id)}>
                  <ConfirmSubmitButton variant="destructive" size="sm" message="Удалить урок?">
                    Удалить
                  </ConfirmSubmitButton>
                </form>
              </div>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Редактировать
              </summary>
              <form
                action={updateLesson.bind(null, courseId, lesson.id)}
                className="mt-3 flex flex-col gap-3"
              >
                <LessonFields idPrefix={`lesson-${lesson.id}`} lesson={lesson} courseAccess={course.access} />
                <Button type="submit" className="self-start">Сохранить</Button>
              </form>
            </details>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Новый урок</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLesson.bind(null, courseId)} className="flex flex-col gap-3">
            <LessonFields idPrefix="new-lesson" courseAccess={course.access} />
            <Button type="submit" className="self-start">Добавить урок</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
