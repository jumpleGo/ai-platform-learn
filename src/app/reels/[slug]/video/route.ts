import { reelMediaResponse } from '@/lib/reel-public';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return reelMediaResponse((await params).slug, 'video');
}
