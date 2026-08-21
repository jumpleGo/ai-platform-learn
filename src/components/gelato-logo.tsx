import Image from 'next/image';

// Вордмарк GELATO: пушистые буквы из logo.webp — заменяет иконку и текстовое написание
export function GelatoLogo({ className = 'h-7' }: { className?: string }) {
  return (
    <Image
      src="/logo.webp"
      alt="GELATO"
      width={574}
      height={154}
      priority
      className={`w-auto select-none ${className}`}
    />
  );
}
