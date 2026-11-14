import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listAllReels, listReelCourses } from '@/lib/db/reels';
import { requireAdmin } from '@/lib/require-admin';
import { ReelUploadForm } from './reel-upload-form';

export default async function AdminReelsPage() {
  await requireAdmin();
  const [reels, courses] = await Promise.all([listAllReels(), listReelCourses()]);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">Рилсы</h1>
      <p className="text-sm text-muted-foreground">Загрузите MP4 до 10 МБ (10 485 760 байт). Новое видео сохраняется как черновик.</p>
      <Card>
        <CardHeader><CardTitle>Новый рилс</CardTitle></CardHeader>
        <CardContent><ReelUploadForm courses={courses} /></CardContent>
      </Card>
      {reels.map((reel) => (
        <Card key={reel.id}>
          <CardHeader>
            <CardTitle>{reel.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {reel.published ? 'Опубликован' : 'Черновик'} · {reel.videoPath ? 'Видео загружено' : 'Без видео'}
            </p>
          </CardHeader>
          <CardContent><ReelUploadForm courses={courses} reel={reel} /></CardContent>
        </Card>
      ))}
    </div>
  );
}
