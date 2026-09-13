import type { Metadata } from 'next';
import { HomeVariantAnalytics } from '@/components/home-variant-analytics';
import { GelateriaScene } from '@/components/scene/gelateria-scene';

// Вариант «сцена» в A/B-тесте главной. Отдельного адреса у него нет: прокси
// подставляет эту страницу под '/', поэтому и canonical здесь — главная.
// Это же и метаданные главной: описание должно говорить, чему тут учат и кого ждут,
// а не пересказывать декорации сцены — в выдаче видно именно его.
export const metadata: Metadata = {
  title: 'GELATO — обучение работе с ИИ: от нуля до своих ИИ-агентов',
  description:
    'Онлайн-школа GELATO: Claude Code с нуля для новичков без опыта, инженерный вайбкодинг для разработчиков и ИИ-мультфильмы. Бесплатные уроки, домашки с личной проверкой.',
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
