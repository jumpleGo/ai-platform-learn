import { ConfirmSubmitButton } from '@/app/admin/courses/confirm-submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { listUsers } from '@/lib/db/users';
import type { Subscription } from '@/lib/types';
import { grantSubscriptionAction, revokeSubscriptionAction } from './actions';
import { GrantSubscriptionDialog } from './grant-subscription-dialog';

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

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listUsers(q?.trim() || undefined);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Пользователи</h1>

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
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>{user.displayName || '—'}</TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString('ru-RU')}</TableCell>
              <TableCell>{user.partnerId ?? '—'}</TableCell>
              <TableCell>
                <SubscriptionBadge sub={user.subscription} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <GrantSubscriptionDialog
                    uid={user.uid}
                    email={user.email}
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
              <TableCell colSpan={6} className="text-muted-foreground">
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
