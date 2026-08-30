import { ConfirmSubmitButton } from '@/app/admin/courses/confirm-submit-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { countUsersByPartner, listPartners } from '@/lib/db/partners';
import type { Partner } from '@/lib/types';
import { deletePartnerAction, savePartnerAction } from './actions';
import { CopyLinkButton } from './copy-link-button';

// Общие поля формы партнёра (создание и редактирование)
function PartnerFields({ idPrefix, partner }: { idPrefix: string; partner?: Partner }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-name`}>Название</Label>
          <Input id={`${idPrefix}-name`} name="name" required className="w-56" defaultValue={partner?.name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-slug`}>Slug</Label>
          <Input
            id={`${idPrefix}-slug`}
            name="slug"
            required
            pattern="[a-z0-9-]+"
            title="Только строчные латинские буквы, цифры и дефис"
            placeholder="acme"
            className="w-40"
            defaultValue={partner?.slug}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-logo`}>Логотип (URL)</Label>
          <Input
            id={`${idPrefix}-logo`}
            name="logoUrl"
            placeholder="https://..."
            className="w-72"
            defaultValue={partner?.logoUrl ?? ''}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-color`}>Цвет бренда</Label>
          <Input
            id={`${idPrefix}-color`}
            name="brandColor"
            pattern="#[0-9a-fA-F]{6}"
            title="Формат #rrggbb"
            placeholder="#7c3aed"
            className="w-32"
            defaultValue={partner?.brandColor ?? ''}
          />
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={partner?.active ?? true} />
          Активен
        </label>
      </div>
    </div>
  );
}

export default async function AdminPartnersPage() {
  const partners = await listPartners();
  const counts = await countUsersByPartner(partners);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Партнёры</h1>

      <Card>
        <CardHeader>
          <CardTitle>Новый партнёр</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={savePartnerAction.bind(null, null)} className="flex flex-col gap-3">
            <PartnerFields idPrefix="new-partner" />
            <Button type="submit" className="self-start">Создать</Button>
          </form>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Ссылка</TableHead>
            <TableHead>Активен</TableHead>
            <TableHead>Приведено юзеров</TableHead>
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((partner) => (
            <TableRow key={partner.id}>
              <TableCell className="font-medium">{partner.name}</TableCell>
              <TableCell>{partner.slug}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <code className="text-xs">/r/{partner.slug}</code>
                  <CopyLinkButton slug={partner.slug} />
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={partner.active ? 'default' : 'secondary'}>
                  {partner.active ? 'Активен' : 'Выключен'}
                </Badge>
              </TableCell>
              <TableCell>{counts.get(partner.slug) ?? 0}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <form action={deletePartnerAction.bind(null, partner.id)}>
                      <ConfirmSubmitButton variant="destructive" size="sm" message="Удалить партнёра?">
                        Удалить
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground">
                      Редактировать
                    </summary>
                    <form
                      action={savePartnerAction.bind(null, partner.id)}
                      className="mt-3 flex flex-col gap-3"
                    >
                      <PartnerFields idPrefix={`partner-${partner.id}`} partner={partner} />
                      <Button type="submit" size="sm" className="self-start">Сохранить</Button>
                    </form>
                  </details>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {partners.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Партнёров пока нет
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
