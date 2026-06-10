import { toEmbedUrl } from '@/lib/video-url';

export function VideoEmbed({ url, title }: { url: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        src={toEmbedUrl(url)}
        title={title}
        className="size-full"
        loading="lazy"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture"
      />
    </div>
  );
}
