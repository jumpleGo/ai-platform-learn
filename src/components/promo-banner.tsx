'use client';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { DoodleWord } from '@/components/doodle-decor';
import { track } from '@/lib/analytics/track-client';
import { EVENTS } from '@/lib/analytics/events';

// Маркетинговые баннеры для пользователей без подписки. Ведут на внешний лендинг оплаты.
const PROMO_URL = 'https://start.gelato.su';
const PROMO_HOST = 'start.gelato.su';

// Кнопка-ссылка на лендинг: клик уходит в воронку
function PromoCta({ place, label }: { place: string; label: string }) {
  return (
    <a
      href={PROMO_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track(EVENTS.subscribeClicked, { place })}
      className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
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
        text="без лимитов"
        color="oklch(0.535 0.1893 28.3)"
        className="z-10 -top-4 left-4 text-xl -rotate-6 sm:-top-6 sm:left-8 sm:text-2xl"
      />
      {/* фон — бумажная текстура; цвет под ней виден, пока картинка грузится */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-primary/30 bg-[#fcecd0] bg-[url(/banner-home-paper.webp)] bg-cover bg-center px-6 py-10 sm:px-12 sm:py-12">
        {/* гусь в правом нижнем углу; края растворены в текстуру прямо в файле */}
        <Image
          src="/banner-home-goose.webp"
          alt=""
          width={760}
          height={619}
          aria-hidden
          className="pointer-events-none absolute right-0 bottom-0 hidden w-[290px] select-none sm:block lg:w-[380px]"
        />
        <div className="relative max-w-xl space-y-4">
          <p className="font-mono text-sm text-brand-charcoal/70">$ подписка</p>
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Все уроки открываются одной подпиской
          </h2>
          <p className="leading-relaxed text-brand-charcoal/75 text-pretty">
            Полный доступ ко&nbsp;всем курсам GELATO: видео, конспекты и&nbsp;материалы уроков.
            Новые курсы открываются сразу, как только выходят.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-3">
            <PromoCta place="promo_home" label="Оформить подписку" />
            <span className="font-mono text-xs text-brand-charcoal/65">{PROMO_HOST}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// Баннер внутри урока — показывается вместо доступа к закрытому видео
export function PromoLessonBanner() {
  return (
    <div className="animate-rise relative mt-2 rounded-2xl border-2 border-dashed border-primary/30 bg-brand-yellow px-5 py-6 sm:px-7">
      <DoodleWord
        text="открой"
        color="oklch(0.2705 0.0677 258.4)"
        className="z-10 -top-3.5 left-4 text-lg -rotate-6 sm:text-xl"
      />
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-sm space-y-1.5">
          <p className="font-medium">Урок открывается подпиской</p>
          <p className="text-sm leading-relaxed text-brand-charcoal/75 text-pretty">
            Видео и&nbsp;полные материалы доступны по&nbsp;подписке. Оформление занимает пару
            минут на&nbsp;{PROMO_HOST}
          </p>
        </div>
        <PromoCta place="promo_lesson" label="Получить доступ" />
      </div>
    </div>
  );
}
