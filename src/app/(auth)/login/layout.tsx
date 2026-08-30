import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Вход в личный кабинет — GELATO',
  description: 'Войдите в личный кабинет школы GELATO, чтобы продолжить обучение и открыть доступ к урокам.',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
