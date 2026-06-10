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

// Диалог выдачи подписки; server action приходит пропсом, уже привязанный к uid
export function GrantSubscriptionDialog({
  uid,
  email,
  action,
}: {
  uid: string;
  email: string;
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`plan-${uid}`}>План</Label>
            <Input id={`plan-${uid}`} name="plan" defaultValue="base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`period-${uid}`}>Период</Label>
            <select id={`period-${uid}`} name="periodDays" className={selectClass} defaultValue="30">
              <option value="30">30 дней</option>
              <option value="90">90 дней</option>
              <option value="365">365 дней</option>
              <option value="unlimited">Бессрочно</option>
            </select>
          </div>
          <Button type="submit">Выдать</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
