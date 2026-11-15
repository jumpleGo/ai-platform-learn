'use client';
import { Button } from '@/components/ui/button';

// Ловит ошибки серверных экшенов и рендера, чтобы не падать белым экраном
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-6">
      <h2 className="text-lg font-bold">Что-то пошло не так</h2>
      <p>{error.message}</p>
      <Button className="self-start" onClick={reset}>
        Попробовать снова
      </Button>
    </div>
  );
}
