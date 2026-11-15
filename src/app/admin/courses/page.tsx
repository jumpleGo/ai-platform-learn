import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { listAllCourses } from '@/lib/db/admin-courses';
import { createCourse, moveCourse } from './actions';
import { courseKey } from '@/lib/slug';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

export default async function AdminCoursesPage() {
  const courses = await listAllCourses();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Курсы</h1>

      <Card>
        <CardHeader>
          <CardTitle>Новый курс</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createCourse} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-course-title">Название</Label>
              <Input id="new-course-title" name="title" required className="w-64" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-course-slug">Адрес (необязательно)</Label>
              <Input
                id="new-course-slug"
                name="slug"
                className="w-52"
                pattern="[a-z0-9][a-z0-9-]*"
                title="Латиница в нижнем регистре, цифры и дефис"
                placeholder="из названия"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-course-description">Описание</Label>
              <Input id="new-course-description" name="description" className="w-80" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-course-access">Доступ</Label>
              <select id="new-course-access" name="access" className={selectClass} defaultValue="free">
                <option value="free">Бесплатный</option>
                <option value="paid">По подписке</option>
              </select>
            </div>
            <Button type="submit">Создать курс</Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Доступ</TableHead>
            <TableHead>Уроки</TableHead>
            <TableHead>Клики</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.map((course) => (
            <TableRow key={course.id}>
              <TableCell>
                <Link href={`/admin/courses/${course.id}`} className="font-medium hover:underline">
                  {course.title}
                </Link>
                <div className="font-mono text-xs text-muted-foreground">/{courseKey(course)}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={course.published ? 'default' : 'secondary'}>
                    {course.published ? 'Опубликован' : 'Черновик'}
                  </Badge>
                  {course.isTest && <Badge variant="destructive">Тест</Badge>}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {course.access === 'paid' ? 'По подписке' : 'Бесплатный'}
                </Badge>
              </TableCell>
              <TableCell>{course.lessonCount}</TableCell>
              <TableCell>{course.isTest ? (course.clickCount ?? 0) : '—'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <form action={moveCourse.bind(null, course.id, 'up')}>
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label="Вверх">
                      <ChevronUp />
                    </Button>
                  </form>
                  <form action={moveCourse.bind(null, course.id, 'down')}>
                    <Button type="submit" variant="ghost" size="icon-sm" aria-label="Вниз">
                      <ChevronDown />
                    </Button>
                  </form>
                  <Link href={`/admin/courses/${course.id}`} className="ml-2 text-sm hover:underline">
                    Редактировать
                  </Link>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {courses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Курсов пока нет
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
