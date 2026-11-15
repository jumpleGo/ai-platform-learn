import type { Metadata } from 'next';
import { GuideRedirect } from './guide-redirect';

// Промежуточная страница для внешних ссылок на гайд: сам PDF Метрика не видит,
// поэтому наружу раздаём /guide — здесь засчитывается цель, потом редирект на файл
export const metadata: Metadata = {
  title: 'Гайд по бесплатным токенам',
  robots: { index: false, follow: false },
};

export default function GuidePage() {
  return <GuideRedirect />;
}
