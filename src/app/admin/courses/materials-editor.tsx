'use client';
import { useState, useTransition } from 'react';
import { Eye, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Markdown } from '@/components/markdown';
import { formatMaterialsAction } from './actions';

// Поле материалов с авто-оформлением через ИИ: вставляешь черновой конспект,
// жмёшь «Оформить» — модель превращает его в аккуратный markdown.
export function MaterialsEditor({ idPrefix, defaultValue }: { idPrefix: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();

  function format() {
    start(async () => {
      try {
        setValue(await formatMaterialsAction(value));
        toast.success('Материалы оформлены');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Не удалось оформить');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`${idPrefix}-materials`}>Материалы урока</Label>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
          >
            <Eye /> {preview ? 'Редактировать' : 'Предпросмотр'}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={format} disabled={pending || !value.trim()}>
            <Sparkles /> {pending ? 'Оформляю…' : 'Оформить через ИИ'}
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-24 rounded-lg border border-border bg-card/40 p-4">
          {value.trim()
            ? <Markdown source={value} />
            : <p className="text-sm text-muted-foreground">Пусто — нечего показать</p>}
        </div>
      ) : (
        <Textarea
          id={`${idPrefix}-materials`}
          name="materials"
          rows={8}
          className="font-mono text-sm"
          placeholder={'Вставьте черновой конспект — даже тезисами. Нажмите «Оформить через ИИ», и он станет аккуратным: заголовки, списки, ссылки, горячие клавиши (Cmd+Enter).'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      )}
      {/* в режиме предпросмотра значение всё равно должно уйти в форму */}
      {preview && <input type="hidden" name="materials" value={value} />}
      <p className="text-xs text-muted-foreground">
        Можно писать вручную (## заголовки, списки, [ссылки](url), {'>'} выноски) или вставить черновик
        и оформить кнопкой. Сочетания клавиш (Cmd+Enter) подсветятся сами.
      </p>
    </div>
  );
}
