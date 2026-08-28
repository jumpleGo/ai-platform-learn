// Настоящий лимон, вырезанный build-scene.py из исходной иллюстрации.
// Один и тот же спрайт падает из окна и катится по тропинке.
export function Lemon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/scene/lemon.webp" width={94} height={83} className={className} alt="" aria-hidden />
  );
}
