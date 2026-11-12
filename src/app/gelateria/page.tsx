import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ExperimentExposure } from '@/components/experiment-exposure';
import { HomeVariantAnalytics } from '@/components/home-variant-analytics';
import { GelateriaScene } from '@/components/scene/gelateria-scene';
import { getExperiment, pickVariant } from '@/lib/experiments';
import { getTariffsForCourse } from '@/lib/payments/tariffs';
import { getPublishedCoursesWithLessons } from '@/lib/db/courses';
import { courseKey } from '@/lib/slug';
import { BEGINNER_URL } from '@/lib/site';
import { BeginnerQuestions } from '@/components/beginner-questions';

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

// Цена-от для карточек курсов на сцене: минимальный тариф курса
const minPrice = (slug: string) => Math.min(...getTariffsForCourse(slug).map((t) => t.price));

export default async function GelateriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const courses = await getPublishedCoursesWithLessons();
  const beginnerCourse = courses.find((course) => `/courses/${courseKey(course)}` === BEGINNER_URL);
  // Тест оффера на первом экране: жребий на сервере по cookie vid (его ставит
  // proxy и прокидывает в заголовок), чтобы первый экран не моргал контролем.
  // QA: ?exp_home_offer=offer — query доезжает сюда вместе с рерайтом из proxy.
  const query = await searchParams;
  const jar = await cookies();
  const experiment = getExperiment('home_offer');
  const forced = query.exp_home_offer;
  const variant =
    typeof forced === 'string' && experiment.variants.includes(forced)
      ? forced
      : pickVariant(experiment, jar.get('vid')?.value ?? 'anonymous');
  const offer =
    variant === 'offer'
      ? { prices: { agents: minPrice('claude-code-agents'), vibecoding: minPrice('vibecoding') } }
      : null;

  return (
    <>
      <HomeVariantAnalytics variant="scene" />
      <ExperimentExposure experimentKey="home_offer" variant={variant} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-20 sm:px-6">
        <BeginnerQuestions course={beginnerCourse} />
      </div>
      <GelateriaScene offer={offer} />
    </>
  );
}
