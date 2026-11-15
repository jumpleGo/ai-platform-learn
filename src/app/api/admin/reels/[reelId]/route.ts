import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/require-admin';
import { deleteReel, ReelMutationError, setReelPublished } from '@/lib/db/reels';

export const runtime = 'nodejs';
type Context = { params: Promise<{ reelId: string }> };
const failure = (error: string, status: number) => Response.json({ error }, { status });

async function mutate(request: Request, context: Context, operation: (id: string) => Promise<object>) {
  try { await requireAdmin(); }
  catch { return failure('Доступ только для администратора.', 403); }
  const origin = request.headers.get('origin');
  // Same proxy-aware origin check as the upload endpoint.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host !== host) return failure('Недопустимый источник запроса.', 403);
    } catch { return failure('Недопустимый источник запроса.', 403); }
  }
  const { reelId } = await context.params;
  if (!/^[\w-]{1,128}$/.test(reelId)) return failure('Некорректный идентификатор рилса.', 400);
  try {
    const result = await operation(reelId);
    revalidatePath('/admin/reels');
    revalidatePath('/reels');
    return Response.json(result);
  } catch (error) {
    return error instanceof ReelMutationError
      ? failure(error.message, error.status)
      : failure('Не удалось сохранить изменения рилса. Повторите попытку.', 500);
  }
}

export async function PATCH(request: Request, context: Context) {
  return mutate(request, context, async (id) => {
    const body = await request.json().catch(() => null);
    if (typeof body?.published !== 'boolean') {
      throw new ReelMutationError(400, 'Укажите, нужно ли опубликовать рилс.');
    }
    await setReelPublished(id, body.published);
    return { published: body.published };
  });
}

export async function DELETE(request: Request, context: Context) {
  return mutate(request, context, async (id) => {
    await deleteReel(id);
    return { deleted: true };
  });
}
