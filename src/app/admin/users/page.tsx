import { ConfirmSubmitButton } from '@/app/admin/courses/confirm-submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { listUsers } from '@/lib/db/users';
import { listPartners } from '@/lib/db/partners';
import { listAllCourses } from '@/lib/db/admin-courses';
import { listPendingGrants } from '@/lib/db/grants';
import type { Subscription } from '@/lib/types';
import {
  grantByEmailAction, grantSubscriptionAction, revokePendingGrantAction, revokeSubscriptionAction,
} from './actions';
import { GrantFields, GrantSubscriptionDialog } from './grant-subscription-dialog';

function isActive(sub: Subscription | null): sub is Subscription {
  return (
    sub !== null &&
    sub.status === 'active' &&
    (sub.expiresAt === null || sub.expiresAt > Date.now())
  );
}

function SubscriptionBadge({ sub }: { sub: Subscription | null }) {
  if (!sub) return <Badge variant="secondary">Нет</Badge>;
  if (!isActive(sub)) return <Badge variant="destructive">Истекла</Badge>;
  if (sub.expiresAt === null) return <Badge>Активна (бессрочно)</Badge>;
  return <Badge>Активна до {new Date(sub.expiresAt).toLocaleDateString('ru-RU')}</Badge>;
}

function periodLabel(days: number | null) {
  return days === null ? 'бессрочно' : `${days} дней`;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [users, partners, courses, pending] = await Promise.all([
    listUsers(q?.trim() || undefined),
    listPartners(),
    listAllCourses(),
    listPendingGrants(),
  ]);
  const partnerOptions = partners.map((p) => ({ slug: p.slug, name: p.name }));
  const partnerName = new Map(partners.map((p) => [p.slug, p.name]));
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));

  // Текстовый охват доступа: все курсы или перечисление выбранных
  function coursesLabel(ids: string[] | null | undefined): string {
    if (!ids) return 'Все курсы';
    return ids.map((id) => courseTitle.get(id) ?? id).join(', ') || '—';
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Пользователи</h1>

      <Card>
        <CardHeader>
          <CardTitle>Выдать доступ по email</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={grantByEmailAction} className="flex flex-col gap-4 sm:max-w-md">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="grant-email">Email</Label>
              <Input id="grant-email" name="email" type="email" required placeholder="user@example.com" />
            </div>
            <GrantFields idPrefix="by-email" partners={partnerOptions} courses={courseOptions} />
            <Button type="submit" className="self-start">Выдать доступ</Button>
            <p className="text-xs text-muted-foreground">
              Если пользователь ещё не зарегистрирован — доступ применится автоматически при
              регистрации с этим email. Срок отсчитывается от момента активации.
            </p>
          </form>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ожидают регистрации</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>План</TableHead>
                  <TableHead>Период</TableHead>
                  <TableHead>Партнёр</TableHead>
                  <TableHead>Курсы</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((g) => (
                  <TableRow key={g.email}>
                    <TableCell className="font-medium">{g.email}</TableCell>
                    <TableCell>{g.plan}</TableCell>
                    <TableCell>{periodLabel(g.periodDays)}</TableCell>
                    <TableCell>{g.partnerId ? (partnerName.get(g.partnerId) ?? g.partnerId) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{coursesLabel(g.courseIds)}</TableCell>
                    <TableCell>
                      <form action={revokePendingGrantAction.bind(null, g.email)}>
                        <ConfirmSubmitButton variant="destructive" size="sm" message="Отменить выдачу?">
                          Отменить
                        </ConfirmSubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <form method="GET" className="flex items-center gap-2">
        <Input name="q" defaultValue={q ?? ''} placeholder="email@example.com" className="w-72" />
        <Button type="submit">Найти</Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Имя</TableHead>
            <TableHead>Дата регистрации</TableHead>
            <TableHead>Партнёр</TableHead>
            <TableHead>Подписка</TableHead>
            <TableHead>Курсы</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>{user.displayName || '—'}</TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</TableCell>
              <TableCell>{user.partnerId ? (partnerName.get(user.partnerId) ?? user.partnerId) : '—'}</TableCell>
              <TableCell>
                <SubscriptionBadge sub={user.subscription} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {isActive(user.subscription) ? coursesLabel(user.subscription.courseIds) : '—'}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <GrantSubscriptionDialog
                    uid={user.uid}
                    email={user.email}
                    partners={partnerOptions}
                    courses={courseOptions}
                    defaultCourseIds={user.subscription?.courseIds ?? null}
                    action={grantSubscriptionAction.bind(null, user.uid)}
                  />
                  {isActive(user.subscription) && (
                    <form action={revokeSubscriptionAction.bind(null, user.uid)}>
                      <ConfirmSubmitButton variant="destructive" size="sm" message="Отозвать подписку?">
                        Отозвать
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {users.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-muted-foreground">
                Пользователи не найдены
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <p className="text-sm text-muted-foreground">Поиск — по точному совпадению email.</p>
    </div>
  );
}
