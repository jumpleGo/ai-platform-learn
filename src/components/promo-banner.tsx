'use client';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { DoodleWord } from '@/components/doodle-decor';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// Маркетинговые баннеры для пользователей без подписки. Ведут на внешний лендинг оплаты.
const PROMO_URL = 'https://vibe.gelato.education';
const PROMO_HOST = 'vibe.gelato.education';

// Только геометрия и поведение. Цвет, шрифт и тень задаёт вызывающий: иначе базовые
// bg/shadow остались бы в атрибуте рядом с переданными и спор решал бы порядок в CSS.
const PROMO_CTA_BASE =
  'inline-flex h-11 items-center gap-1.5 rounded-xl px-6 text-[15px] transition-all duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0';

// Вид кнопки главной — цвета гуся: заливка звёзд, тень цветом клюва
const PROMO_CTA_GOOSE =
  'btn-goose border-2 border-brand-navy font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] hover:shadow-[0_5px_0_0_var(--color-goose-red)]';

// Вид кнопки в баннере урока — цвета платка таксы, как на бумажной рамке
const PROMO_CTA_SCARF =
  'btn-scarf border-2 border-brand-navy font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-scarf-green)] hover:shadow-[0_5px_0_0_var(--color-scarf-green)]';

// Кнопка-ссылка на лендинг: клик уходит в воронку
function PromoCta({ place, label, look }: { place: string; label: string; look: string }) {
  return (
    <a
      href={PROMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EVENTS.subscribeClicked, { place })}
      className={`${PROMO_CTA_BASE} ${look}`}
    >
      {label}
      <ArrowUpRight className="size-4" aria-hidden />
    </a>
  );
}

// Крупный баннер в конце главной — основной оффер
export function PromoBanner() {
  return (
    <section className="animate-rise relative" style={{ '--rise-delay': '0.16s' } as React.CSSProperties}>
      <DoodleWord
        text="IT + вайбкодинг"
        color="oklch(0.535 0.1893 28.3)"
        className="z-10 -top-4 left-4 text-xl -rotate-6 sm:-top-6 sm:left-8 sm:text-2xl"
      />
      {/* фон — бумажная текстура; цвет под ней виден, пока картинка грузится */}
      <div className="banner-goose-frame relative overflow-hidden rounded-3xl px-6 pt-10 pb-32 sm:px-12 sm:py-12">
        {/* гусь в правом нижнем углу; края растворены в текстуру прямо в файле */}
        <Image
          src="/banner-home-goose.webp"
          alt=""
          width={760}
          height={619}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 w-[150px] select-none sm:w-[290px] lg:w-[380px]"
        />
        <div className="relative max-w-xl space-y-4">
          <h2 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Умный вайбкодинг для программистов и вайбкодеров. 0 багов от ИИ.
          </h2>
          <p className="leading-relaxed text-brand-charcoal/75 text-pretty">
            Как настроить проект и что включить в него, чтобы ИИ летала в твоем проекте и реализовывала задачи с правильным инженерским подходом. Обучает инженер с 8 летним опытом.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-3">
            <PromoCta place="promo_home" label="Смотреть программу" look={PROMO_CTA_GOOSE} />
          </div>
        </div>
      </div>
    </section>
  );
}

// Баннер внутри урока — показывается вместо доступа к закрытому видео
export function PromoLessonBanner() {
  return (
    <div className="banner-marine-frame animate-rise relative mt-2 overflow-hidden rounded-2xl px-5 py-6 sm:px-7">
      {/* такса из баннера уроков: блок должен читаться как оффер, а не как плашка */}
      <Image
        src="/banner-lesson-dachshund.webp"
        alt=""
        width={660}
        height={809}
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-0 hidden w-[130px] select-none sm:block lg:w-[160px]"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-x-8 gap-y-5 sm:pr-36 lg:pr-44">
        <div className="min-w-0 max-w-sm space-y-1.5">
          <p className="font-heading text-lg font-extrabold tracking-tight text-brand-navy">Урок открывается подпиской</p>
          <p className="text-sm leading-relaxed font-medium text-brand-charcoal/80 text-pretty">
            Видео и&nbsp;полные материалы доступны по&nbsp;подписке. Оформление занимает пару
            минут на&nbsp;{PROMO_HOST}
          </p>
        </div>
        <PromoCta place="promo_lesson" label="Получить доступ" look={PROMO_CTA_SCARF} />
      </div>
    </div>
  );
}
