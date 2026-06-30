'use client';

// iframe указывает на наш прокси-роут, а не на YouTube — id ролика не попадает
// ни в исходник страницы, ни в RSC-пейлоад. Контекстное меню по обёртке отключено.
export function VideoEmbed({ courseId, lessonId, title }: {
  courseId: string;
  lessonId: string;
  title: string;
}) {
  return (
    <div
      className="aspect-video w-full overflow-hidden rounded-lg bg-black"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        src={`/api/player/${courseId}/${lessonId}`}
        title={title}
        className="size-full"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      />
    </div>
  );
}
