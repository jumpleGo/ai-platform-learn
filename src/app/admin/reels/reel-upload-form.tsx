'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MAX_REEL_BYTES, MAX_REEL_DESCRIPTION_LENGTH, REEL_TEXT_FIELDS, type Reel } from '@/lib/reels';
import { saveReelAction } from './actions';

function uploadVideo(id: string, file: File, progress: (loaded: number, total: number) => void): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/reels/${encodeURIComponent(id)}/upload`);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.timeout = 120_000;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) progress(event.loaded, event.total);
    };
    xhr.onload = () => {
      let response: { error?: string; warning?: string } = {};
      try { response = JSON.parse(xhr.responseText); } catch { /* nginx can return HTML errors. */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(response.warning);
      else reject(new Error(response.error || (xhr.status === 413 ? 'Файл больше 10 МБ.' : 'Не удалось загрузить видео.')));
    };
    xhr.onerror = () => reject(new Error('Ошибка сети. Повторите загрузку.'));
    xhr.onabort = () => reject(new Error('Загрузка прервана. Повторите попытку.'));
    xhr.ontimeout = () => reject(new Error('Время загрузки истекло. Повторите попытку.'));
    xhr.send(file);
  });
}

const inputClass = 'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm';

export function ReelUploadForm({ courses, reel }: {
  courses: Array<{ slug: string; title: string }>;
  reel?: Reel;
}) {
  const router = useRouter();
  // The ref closes the window before React renders the disabled button.
  const inFlight = useRef(false);
  const draftId = useRef<string | null>(reel?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
  const [progress, setProgress] = useState({ loaded: 0, total: 1 });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const prefix = reel?.id ?? 'new-reel';
  const reelTitle = reel?.title || courses.find((course) => course.slug === reel?.courseSlug)?.title || reel?.courseSlug;

  async function manageReel(action: 'publish' | 'unpublish' | 'delete') {
    if (!reel || inFlight.current) return;
    if (action === 'delete' && !window.confirm(`Удалить рилс «${reelTitle}» и его видео? Это действие нельзя отменить.`)) return;
    inFlight.current = true;
    setBusy(true); setPendingAction(action); setError(''); setMessage('');
    const fallback = action === 'delete' ? 'Не удалось удалить рилс. Повторите попытку.' : 'Не удалось изменить публикацию. Повторите попытку.';
    try {
      const response = await fetch(`/api/admin/reels/${encodeURIComponent(reel.id)}`, action === 'delete'
        ? { method: 'DELETE' }
        : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ published: action === 'publish' }) },
      ).catch(() => { throw new Error('Ошибка сети. Повторите попытку.'); });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : fallback);
      setMessage(action === 'delete' ? 'Рилс удалён.' : action === 'publish' ? 'Рилс опубликован.' : 'Рилс снят с публикации.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : fallback);
    } finally {
      inFlight.current = false;
      setBusy(false); setPendingAction(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    inFlight.current = true;
    setBusy(true); setError(''); setMessage(''); setProgress({ loaded: 0, total: 1 });
    try {
      const data = new FormData(form);
      const video = data.get('video');
      const hasVideo = video instanceof File && video.name !== '';
      if (hasVideo && (video.size === 0 || video.size > MAX_REEL_BYTES
        || !/\.mp4$/i.test(video.name) || (video.type && video.type !== 'video/mp4'))) {
        throw new Error('Выберите непустой MP4 до 10 МБ (10 485 760 байт).');
      }
      if (!hasVideo && !reel?.videoPath) throw new Error('Выберите MP4 для загрузки.');
      // Only text metadata goes through the Server Action; video uses the upload API.
      const metadata = new FormData();
      for (const name of [...REEL_TEXT_FIELDS, 'courseSlug', 'order']) metadata.set(name, data.get(name) ?? '');
      draftId.current = await saveReelAction(draftId.current, metadata);
      const warning = hasVideo ? await uploadVideo(draftId.current, video, (loaded, total) => setProgress({ loaded, total })) : undefined;
      setMessage(warning || (hasVideo ? 'Видео загружено. Рилс сохранён как черновик.' : 'Изменения сохранены.'));
      if (!reel) { form.reset(); draftId.current = null; }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить рилс.');
      // Keep the draft id and file selection so retry does not create another reel.
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-busy={busy}>
      <fieldset disabled={busy || courses.length === 0} className="flex flex-col gap-3">
        <label htmlFor={`${prefix}-title`} className="flex flex-col gap-1.5 text-sm">
          Заголовок (необязательно)
          <input id={`${prefix}-title`} name="title" maxLength={120} defaultValue={reel?.title ?? ''} placeholder="Заголовок курса" className={inputClass} />
        </label>
        <label htmlFor={`${prefix}-description`} className="flex flex-col gap-1.5 text-sm">
          Короткое описание (необязательно, до 300 символов)
          <textarea id={`${prefix}-description`} name="description" maxLength={MAX_REEL_DESCRIPTION_LENGTH} rows={3} defaultValue={reel?.description ?? ''} placeholder="Описание курса" className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
        </label>
        <label htmlFor={`${prefix}-cta-label`} className="flex flex-col gap-1.5 text-sm">
          Текст кнопки (необязательно)
          <input id={`${prefix}-cta-label`} name="ctaLabel" defaultValue={reel?.ctaLabel ?? ''} placeholder="Перейти в курс" className={inputClass} />
        </label>
        <label htmlFor={`${prefix}-cta-href`} className="flex flex-col gap-1.5 text-sm">
          Ссылка кнопки (необязательно)
          <input id={`${prefix}-cta-href`} name="ctaHref" inputMode="url" defaultValue={reel?.ctaHref ?? ''} placeholder="/courses/..." aria-describedby={`${prefix}-cta-help`} className={inputClass} />
        </label>
        <p id={`${prefix}-cta-help`} className="text-xs text-muted-foreground">
          Укажите путь на сайте, начиная с /, или полный адрес https://. Пустые поля используют заголовок и описание курса, кнопку «Перейти в курс» и ссылку на выбранный курс.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor={`${prefix}-course`} className="flex flex-col gap-1.5 text-sm">
            Курс
            <select id={`${prefix}-course`} name="courseSlug" required defaultValue={reel?.courseSlug ?? courses[0]?.slug} className={inputClass}>
              {courses.map((course) => <option key={course.slug} value={course.slug}>{course.title}</option>)}
            </select>
          </label>
          <label htmlFor={`${prefix}-order`} className="flex flex-col gap-1.5 text-sm">
            Порядок
            <input id={`${prefix}-order`} name="order" type="number" min={0} step={1} required defaultValue={reel?.order ?? 0} className={inputClass} />
          </label>
        </div>
        <label htmlFor={`${prefix}-video`} className="flex flex-col gap-1.5 text-sm">
          {reel?.videoPath ? 'Заменить видео (необязательно)' : 'Видео MP4'}
          <input id={`${prefix}-video`} name="video" type="file" accept="video/mp4,.mp4" required={!reel?.videoPath} className="text-sm" />
        </label>
        {reel?.videoPath && <p className="text-xs text-muted-foreground">После успешной замены старый файл удаляется, рилс становится черновиком.</p>}
      </fieldset>
      {courses.length === 0 && <p role="status" className="text-sm">Сначала опубликуйте курс.</p>}
      {busy && !pendingAction && (
        <div className="flex flex-col gap-1">
          <progress aria-label="Прогресс загрузки видео" value={progress.loaded} max={progress.total} className="w-full" />
          <p role="status" className="text-sm text-muted-foreground">
            {progress.loaded === 0 ? 'Подготовка и загрузка…' : progress.loaded === progress.total ? 'Видео отправлено, ожидаем сохранения…' : `Загружено ${Math.round(progress.loaded / progress.total * 100)}%`}
          </p>
        </div>
      )}
      {pendingAction && <p role="status" className="text-sm">{pendingAction === 'delete' ? 'Удаляем рилс…' : 'Меняем публикацию…'}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || courses.length === 0} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
          {busy && !pendingAction ? 'Сохраняем…' : reel ? 'Сохранить' : 'Загрузить рилс'}
        </button>
        {reel && <>
          <button type="button" disabled={busy} onClick={() => manageReel(reel.published ? 'unpublish' : 'publish')} className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-50">
            {reel.published ? 'Снять с публикации' : 'Опубликовать'}
          </button>
          <button type="button" disabled={busy} onClick={() => manageReel('delete')} className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive disabled:opacity-50">
            Удалить
          </button>
        </>}
      </div>
    </form>
  );
}
