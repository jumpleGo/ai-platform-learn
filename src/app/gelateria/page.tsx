import type { Metadata } from 'next';
import { HomeVariantAnalytics } from '@/components/home-variant-analytics';
import { GelateriaScene } from '@/components/scene/gelateria-scene';

// Вариант «сцена» в A/B-тесте главной. Отдельного адреса у него нет: прокси
// подставляет эту страницу под '/', поэтому и canonical здесь — главная.
export const metadata: Metadata = {
  title: 'GELATO — джелатерия, где учат работать с ИИ',
  description:
    'Одна нарисованная сцена: витрина джелатерии, двор с лимонами, пляж и море. Пока крутите вниз — рассказываем, как устроена школа.',
  alternates: { canonical: '/' },
};

export default function GelateriaPage() {
  return (
    <>
      <HomeVariantAnalytics variant="scene" />
      <GelateriaScene />
    </>
  );
}
