'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Живой предпросмотр варианта баннера: берём текст из соседнего textarea и вставляем
// как HTML. Показываем именно то, что сейчас в поле, — до сохранения урока.
// Стили баннера свои и заскоупленные, <script> innerHTML не исполнит.
export function VariantPreview({ textareaId }: { textareaId: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const open = html !== null;
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          if (open) return setHtml(null);
          const field = document.getElementById(textareaId) as HTMLTextAreaElement | null;
          setHtml(field?.value ?? '');
        }}
      >
        {open ? 'Скрыть предпросмотр' : 'Показать'}
      </Button>
      {open && (
        <div className="rounded-lg border border-dashed bg-background p-3">
          {html.trim() ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-sm text-muted-foreground">Поле пустое — показывать нечего</p>
          )}
        </div>
      )}
    </div>
  );
}
