import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Access, Lesson } from '@/lib/types';
import { getCourseWithLessons } from '@/lib/db/admin-courses';
import { isLessonPublished } from '@/lib/access';
import { getLessonBannerStats, type BannerStat } from '@/lib/db/banner-stats';
import {
  BANNER_SLOTS, SLOT_TITLES, VARIANT_IDS, slotVariants, variantLabel, type BannerSlot,
} from '@/lib/banners';
import { courseKey, lessonPath, waitlistPath } from '@/lib/slug';
import {
  createLesson, deleteCourse, deleteLesson, moveLesson, resetBannerStats, updateCourse,
  updateLesson,
} from '../actions';
import { ConfirmSubmitButton } from '../confirm-submit-button';
import { MaterialsEditor } from '../materials-editor';
import { VariantPreview } from '../variant-preview';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

// Ключ перемонтирует форму после сохранения, чтобы uncontrolled-поля
// переинициализировались с новыми значениями (иначе Base UI ругается на смену defaultValue)
function valuesKey(values: Array<string | number | boolean | null>) {
  return values.join('␟');
}

// Редактор одного слота маркетинговых блоков: 4 фиксированных варианта A–D.
// Пустой html — варианта нет; вес 0 — вариант выключен.
function VariantsEditor({ idPrefix, slot, lesson, lessonPublicPath }: {
  idPrefix: string;
  slot: BannerSlot;
  lesson?: Lesson;
  // адрес урока на сайте — есть только у сохранённого урока
  lessonPublicPath?: string;
}) {
  const variants = lesson ? slotVariants(lesson, slot) : [];
  return (
    <details className="rounded-lg border border-dashed p-3" open={variants.length > 1}>
      <summary className="cursor-pointer text-sm font-medium">
        {SLOT_TITLES[slot]} — HTML{variants.length > 0 && ` · вариантов: ${variants.length}`}
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Готовый HTML вставляется как есть. Показы делятся по весам между заполненными
        вариантами, вес 0 — вариант выключен, все нули — блок не показывается.
        Одному посетителю всегда достаётся один и тот же вариант.
        Имя кнопки в статистике можно задать атрибутом <code>data-cta</code> у ссылки.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        {VARIANT_IDS.map((id) => {
          const variant = variants.find((v) => v.id === id);
          return (
            <div key={id} className="flex flex-col gap-1.5 rounded-lg border p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-xs font-medium">
                  {variantLabel(id)}
                </span>
                <Input
                  name={`${slot}_${id}_name`}
                  aria-label={`Название варианта ${variantLabel(id)}`}
                  placeholder="Название варианта"
                  className="h-8 flex-1"
                  defaultValue={variant?.name ?? ''}
                />
                <Input
                  name={`${slot}_${id}_weight`}
                  aria-label={`Вес варианта ${variantLabel(id)}`}
                  type="number"
                  min={0}
                  max={1000}
                  placeholder="вес 100"
                  className="h-8 w-24"
                  defaultValue={variant ? String(variant.weight) : ''}
                />
              </div>
              <Textarea
                id={`${idPrefix}-${slot}-${id}`}
                name={`${slot}_${id}_html`}
                aria-label={`HTML варианта ${variantLabel(id)}`}
                rows={4}
                placeholder="HTML варианта — пусто, значит варианта нет"
                defaultValue={variant?.html ?? ''}
              />
              <div className="flex flex-wrap items-center gap-3">
                <VariantPreview textareaId={`${idPrefix}-${slot}-${id}`} />
                {variant && lessonPublicPath && (
                  <Link
                    href={`${lessonPublicPath}?banner=${slot}:${id}`}
                    target="_blank"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Открыть урок с этим вариантом ↗
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

// Статистика A/B-теста по уроку: показы, клики, CTR и разбивка по ссылкам
function BannerStats({ courseId, lesson, stats }: {
  courseId: string;
  lesson: Lesson;
  stats: BannerStat[];
}) {
  const total = stats.reduce((sum, s) => sum + s.shown + s.clicks, 0);
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Статистика баннеров{total > 0 ? '' : ' — пока пусто'}
      </summary>
      <div className="mt-3 flex flex-col gap-4">
        {BANNER_SLOTS.map((slot) => {
          const variants = slotVariants(lesson, slot);
          const slotStats = stats.filter((s) => s.slot === slot);
          // вариант могли удалить из админки, а его счётчики остались — показываем и их
          const ids = [...new Set([...variants.map((v) => v.id), ...slotStats.map((s) => s.variantId)])];
          if (ids.length === 0) return null;
          return (
            <div key={slot} className="flex flex-col gap-2">
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                {SLOT_TITLES[slot]}
              </p>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="border-b py-1.5 pr-2 font-medium">Вариант</th>
                    <th className="border-b py-1.5 pr-2 font-medium">Вес</th>
                    <th className="border-b py-1.5 pr-2 font-medium">Показы</th>
                    <th className="border-b py-1.5 pr-2 font-medium">Клики</th>
                    <th className="border-b py-1.5 font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {ids.map((id) => {
                    const variant = variants.find((v) => v.id === id);
                    const stat = slotStats.find((s) => s.variantId === id);
                    const shown = stat?.shown ?? 0;
                    const clicks = stat?.clicks ?? 0;
                    const links = Object.values(stat?.links ?? {}).sort((a, b) => b.clicks - a.clicks);
                    return (
                      <Fragment key={id}>
                        <tr>
                          <td className="border-b py-1.5 pr-2">
                            <span className="font-mono text-xs">{variantLabel(id)}</span>
                            <span className="ml-2">{variant?.name ?? 'вариант удалён'}</span>
                          </td>
                          <td className="border-b py-1.5 pr-2 tabular-nums text-muted-foreground">
                            {variant ? variant.weight : '—'}
                          </td>
                          <td className="border-b py-1.5 pr-2 tabular-nums">{shown}</td>
                          <td className="border-b py-1.5 pr-2 tabular-nums">{clicks}</td>
                          <td className="border-b py-1.5 tabular-nums font-medium">
                            {shown > 0 ? `${((clicks / shown) * 100).toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                        {links.length > 0 && (
                          <tr>
                            <td colSpan={5} className="border-b py-1.5 pl-6">
                              <ul className="flex flex-col gap-1">
                                {links.map((link) => (
                                  <li key={link.href} className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                                    <span className="tabular-nums font-medium text-foreground">{link.clicks}</span>
                                    <span>{link.label || 'без текста'}</span>
                                    <span className="font-mono break-all">{link.href}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
        {total > 0 && (
          <form action={resetBannerStats.bind(null, courseId, lesson.id)}>
            <ConfirmSubmitButton variant="outline" size="sm" message="Обнулить счётчики баннеров этого урока?">
              Сбросить статистику
            </ConfirmSubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}

// Общие поля формы урока (создание и редактирование)
function LessonFields({ idPrefix, lesson, courseAccess, courseIsTest, lessonPublicPath }: {
  idPrefix: string;
  lesson?: Lesson;
  courseAccess: Access;
  courseIsTest: boolean;
  lessonPublicPath?: string;
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
        <Label htmlFor={`${idPrefix}-video`}>
          Ссылка на видео{courseIsTest && <span className="text-muted-foreground"> — необязательно</span>}
        </Label>
        <Input
          id={`${idPrefix}-video`}
          name="videoEmbedUrl"
          required={!courseIsTest}
          pattern="https://.*"
          title="Ссылка должна начинаться с https://"
          placeholder="https://..."
          defaultValue={lesson?.videoEmbedUrl}
        />
        <p className="text-xs text-muted-foreground">
          Ссылка на YouTube (любой формат) или embed-ссылка видеохостинга
          {courseIsTest && '. У тестового курса можно оставить пустым — урок будет без видео'}
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
            placeholder="авто"
            defaultValue={lesson?.durationSec ?? ''}
          />
          <p className="text-xs text-muted-foreground">Пусто — возьмём из видео</p>
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
        <div className="flex flex-col gap-1.5">
          <label className="flex h-8 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="published"
              defaultChecked={lesson ? isLessonPublished(lesson) : true}
            />
            Опубликован
          </label>
          <p className="text-xs text-muted-foreground">
            Снимите&nbsp;— урок пропадёт с&nbsp;витрин, из&nbsp;меню курса и&nbsp;карты сайта,
            а&nbsp;прямая ссылка отдаст 404. Номера остальных уроков не&nbsp;сдвинутся.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-preview`}>Превью-обложка</Label>
        {lesson?.previewImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lesson.previewImageUrl}
            alt="Текущее превью"
            className="aspect-video w-48 rounded-lg border border-border object-cover"
          />
        )}
        <input
          id={`${idPrefix}-preview`}
          type="file"
          name="previewImage"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-muted"
        />
        {lesson?.previewImageUrl && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="removePreview" /> Удалить превью
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          PNG/JPEG/WebP до 5 МБ. Пусто — на карточке будет кадр из видео.
        </p>
      </div>
      <MaterialsEditor idPrefix={idPrefix} defaultValue={lesson?.materials ?? ''} />

      <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
        <p className="text-sm font-medium">Страница урока</p>
        <p className="text-xs text-muted-foreground">
          Галочки убирают навигацию: со страницы урока некуда уйти, остаётся только видео.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hideHeader" defaultChecked={lesson?.hideHeader} />
          Скрыть шапку сайта
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hideBackLink" defaultChecked={lesson?.hideBackLink} />
          Скрыть ссылку назад к курсу
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hideLessonsNav" defaultChecked={lesson?.hideLessonsNav} />
          Скрыть меню уроков курса
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="hideFooter" defaultChecked={lesson?.hideFooter} />
          Скрыть подвал
        </label>
      </div>

      {BANNER_SLOTS.map((slot) => (
        <VariantsEditor
          key={slot}
          idPrefix={idPrefix}
          slot={slot}
          lesson={lesson}
          lessonPublicPath={lessonPublicPath}
        />
      ))}
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
  // счётчики A/B-теста по каждому уроку курса — админка всегда показывает свежие
  const bannerStats = new Map(
    await Promise.all(course.lessons.map(async (l) =>
      [l.id, await getLessonBannerStats(courseId, l.id)] as const,
    )),
  );

  // адрес курса на сайте: у тестового это лендинг предзаписи, у обычного — первый урок
  const publicPath = course.isTest
    ? waitlistPath(courseKey(course))
    : lessonPath(courseKey(course), 1);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{course.title}</h1>
        <div className="flex items-center gap-4">
          <Link href={publicPath} className="text-sm text-muted-foreground hover:underline">
            Открыть на сайте ↗
          </Link>
          <Link href="/admin/courses" className="text-sm text-muted-foreground hover:underline">
            ← Все курсы
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Курс</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            key={valuesKey([
              course.title, course.slug, course.description, course.access, course.published,
              course.isTest, course.testToastMessage, course.testLandingHtml,
              course.showBadge, course.badgeText, course.highlightBackground,
            ])}
            action={updateCourse.bind(null, courseId)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-title">Название</Label>
              <Input id="course-title" name="title" required defaultValue={course.title} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-slug">Адрес курса</Label>
              <Input
                id="course-slug"
                name="slug"
                pattern="[a-z0-9][a-z0-9-]*"
                title="Латиница в нижнем регистре, цифры и дефис"
                placeholder="osnovy-claude-code"
                defaultValue={course.slug ?? ''}
              />
              <p className="text-xs text-muted-foreground">
                Латиница, цифры и дефис. Пусто — соберём из названия транслитом.
                Сейчас: <code>{publicPath}</code>
              </p>
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
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="isTest" defaultChecked={course.isTest} />
                Тестовый курс (без реального доступа)
              </label>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-test-toast">Текст тоста при клике</Label>
                <Input
                  id="course-test-toast"
                  name="testToastMessage"
                  placeholder="Курс скоро откроется"
                  defaultValue={course.testToastMessage ?? ''}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-test-html">HTML лендинга предзаписи</Label>
                <Textarea
                  id="course-test-html"
                  name="testLandingHtml"
                  rows={6}
                  placeholder={`Вставьте готовый HTML — покажется на ${waitlistPath(courseKey(course))}`}
                  defaultValue={course.testLandingHtml ?? ''}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-dashed p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" name="showBadge" defaultChecked={course.showBadge} />
                Показать тег рядом с названием
              </label>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="course-badge-text">Текст тега</Label>
                <Input
                  id="course-badge-text"
                  name="badgeText"
                  placeholder="Например: новинка"
                  defaultValue={course.badgeText ?? ''}
                />
              </div>
            </div>

            <label className="flex h-8 items-center gap-2 text-sm">
              <input type="checkbox" name="highlightBackground" defaultChecked={course.highlightBackground} />
              Подсветить фон полки на весь экран
            </label>

            <Button type="submit" className="self-start">Сохранить</Button>
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
        {course.lessons.map((lesson, i) => (
          <div key={lesson.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* номер = сегмент URL урока */}
              <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="font-medium">{lesson.title}</span>
              <Badge variant="outline">
                {lesson.access === 'paid' ? 'По подписке' : 'Бесплатный'}
              </Badge>
              {!isLessonPublished(lesson) && <Badge variant="destructive">Скрыт</Badge>}
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
                key={valuesKey([
                  lesson.title, lesson.description, lesson.videoEmbedUrl,
                  lesson.durationSec, lesson.access, lesson.published, lesson.materials,
                  lesson.previewImageUrl,
                  lesson.hideHeader, lesson.hideFooter, lesson.hideBackLink, lesson.hideLessonsNav,
                  JSON.stringify(lesson.marketingVariants ?? null),
                  JSON.stringify(lesson.relatedVariants ?? null),
                  lesson.marketingHtml, lesson.relatedHtml,
                ])}
                action={updateLesson.bind(null, courseId, lesson.id)}
                className="mt-3 flex flex-col gap-3"
              >
                <LessonFields
                  idPrefix={`lesson-${lesson.id}`}
                  lesson={lesson}
                  courseAccess={course.access}
                  courseIsTest={course.isTest}
                  lessonPublicPath={lessonPath(courseKey(course), i + 1)}
                />
                <Button type="submit" className="self-start">Сохранить</Button>
              </form>
            </details>
            <BannerStats courseId={courseId} lesson={lesson} stats={bannerStats.get(lesson.id) ?? []} />
          </div>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Новый урок</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLesson.bind(null, courseId)} className="flex flex-col gap-3">
            <LessonFields idPrefix="new-lesson" courseAccess={course.access} courseIsTest={course.isTest} />
            <Button type="submit" className="self-start">Добавить урок</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
