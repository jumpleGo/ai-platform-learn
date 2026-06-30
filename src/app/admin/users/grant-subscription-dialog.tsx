'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const selectClass =
  'h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

export type PartnerOption = { slug: string; name: string };
export type CourseOption = { id: string; title: string };

// Поля выдачи доступа (план/период/партнёр/курсы) — общие для диалога и формы по email
export function GrantFields({
  idPrefix,
  partners,
  courses,
  defaultCourseIds = null,
}: {
  idPrefix: string;
  partners: PartnerOption[];
  courses: CourseOption[];
  // Текущий набор курсов для предзаполнения; null — все курсы
  defaultCourseIds?: string[] | null;
}) {
  // «Все курсы» отключает выбор конкретных; при выдаче конкретных курсов — наоборот
  const [allCourses, setAllCourses] = useState(defaultCourseIds === null);
  // «Бессрочно» отключает поле с числом дней
  const [unlimited, setUnlimited] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`plan-${idPrefix}`}>План</Label>
        <Input id={`plan-${idPrefix}`} name="plan" defaultValue="base" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`period-${idPrefix}`}>Период</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              id={`period-${idPrefix}`}
              name="periodDays"
              type="number"
              min={1}
              defaultValue="30"
              disabled={unlimited}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">дней</span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="unlimited"
              value="1"
              checked={unlimited}
              onChange={(e) => setUnlimited(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Бессрочно
          </label>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`partner-${idPrefix}`}>Партнёр (бренд)</Label>
        <select id={`partner-${idPrefix}`} name="partnerId" className={selectClass} defaultValue="">
          <option value="">— не менять —</option>
          {partners.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Пользователь увидит платформу как от выбранного партнёра.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Курсы</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="allCourses"
            value="1"
            checked={allCourses}
            onChange={(e) => setAllCourses(e.target.checked)}
            className="size-4 rounded border-input"
          />
          Все курсы
        </label>
        <div className="flex flex-col gap-1.5 rounded-lg border border-input p-2.5">
          {courses.length === 0 && (
            <p className="text-xs text-muted-foreground">Курсов пока нет.</p>
          )}
          {courses.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 text-sm data-[disabled]:opacity-50"
              data-disabled={allCourses ? '' : undefined}
            >
              <input
                type="checkbox"
                name="courseIds"
                value={c.id}
                defaultChecked={defaultCourseIds?.includes(c.id) ?? false}
                disabled={allCourses}
                className="size-4 rounded border-input"
              />
              {c.title}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Доступ откроется только к&nbsp;выбранным курсам. «Все курсы»&nbsp;— полная подписка.
        </p>
      </div>
    </>
  );
}

// Диалог выдачи подписки конкретному пользователю; server action приходит пропсом, привязанный к uid
export function GrantSubscriptionDialog({
  uid,
  email,
  partners,
  courses,
  defaultCourseIds = null,
  action,
}: {
  uid: string;
  email: string;
  partners: PartnerOption[];
  courses: CourseOption[];
  defaultCourseIds?: string[] | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Выдать подписку
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Выдать подписку</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-4"
        >
          <p className="text-sm text-muted-foreground">{email}</p>
          <GrantFields idPrefix={uid} partners={partners} courses={courses} defaultCourseIds={defaultCourseIds} />
          <Button type="submit">Выдать</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
