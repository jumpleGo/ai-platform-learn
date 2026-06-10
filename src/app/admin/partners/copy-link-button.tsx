'use client';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

// Копирует полную партнёрскую ссылку в буфер обмена
export function CopyLinkButton({ slug }: { slug: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Копировать ссылку"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/r/${slug}`);
        toast.success('Ссылка скопирована');
      }}
    >
      <Copy />
    </Button>
  );
}
