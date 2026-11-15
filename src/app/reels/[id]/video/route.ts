import { redirectReelMedia } from '@/lib/reel-media';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return redirectReelMedia((await params).id, 'video');
}
