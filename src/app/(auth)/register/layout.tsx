import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Регистрация — GELATO',
  description: 'Создайте аккаунт в школе GELATO, чтобы начать обучение и получить доступ к курсам.',
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
