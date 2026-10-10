import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { listLeads } from '@/lib/db/leads';

// Лиды с лендингов: кто оставил контакт в форме «пришлю программу». Только просмотр
export default async function AdminLeadsPage() {
  const leads = await listLeads();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Лиды</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Оставили контакт на лендинге, ждут программу и пример домашнего задания. Последние {leads.length}.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Когда</TableHead>
            <TableHead>Контакт</TableHead>
            <TableHead>Курс</TableHead>
            <TableHead>Откуда</TableHead>
            <TableHead>UTM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(lead.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}
              </TableCell>
              <TableCell className="font-medium">
                {lead.type === 'telegram' ? (
                  <a
                    href={`https://t.me/${lead.contact.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {lead.contact}
                  </a>
                ) : (
                  <a href={`mailto:${lead.contact}`} className="underline underline-offset-2">{lead.contact}</a>
                )}
                <Badge variant="secondary" className="ml-2">{lead.type === 'telegram' ? 'TG' : 'email'}</Badge>
              </TableCell>
              <TableCell><code className="text-xs">{lead.courseSlug}</code></TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {lead.place}{lead.fromLanding ? ` · from=${lead.fromLanding}` : ''}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {lead.utm ? Object.entries(lead.utm).map(([k, v]) => `${k.replace(/^utm_/, '')}=${v}`).join(', ') : '—'}
              </TableCell>
            </TableRow>
          ))}
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">Лидов пока нет</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
