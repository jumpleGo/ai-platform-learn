import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Briefcase, Send } from 'lucide-react';
import { FAQ_GROUPS } from '@/lib/faq-content';
import { SITE_URL, TELEGRAM_DM } from '@/lib/site';
import { StickerTag, TitleAccent } from '@/components/accent';
import { FaqAccordion } from '@/components/faq-accordion';
import { DoodleWord } from '@/components/doodle-decor';
import { SectionHead } from '@/components/section-head';

export const metadata: Metadata = {
  title: 'Вопрос-ответ — обучение работе с ИИ | GELATO',
  description:
    'Ответы на вопросы про обучения GELATO: кому подойдёт, как проходит, сколько стоит, чем отличается от больших платформ, возврат и корпоративный доступ.',
  alternates: { canonical: '/faq' },
};

// Разметка FAQPage: вопросы попадают в выдачу отдельными строками
function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/faq#faq`,
    mainEntity: FAQ_GROUPS.flatMap((group) =>
      group.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    ),
  };
}

export default function FaqPage() {
  const total = FAQ_GROUPS.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-24 sm:space-y-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c') }}
      />

      <section className="animate-rise relative space-y-6 pt-6 sm:pt-10">
        <DoodleWord
          text="без воды"
          color="oklch(0.535 0.1893 28.3)"
          className="z-10 -top-1 right-2 text-xl -rotate-6 sm:text-2xl"
        />
        <h1 className="font-heading text-[clamp(2.6rem,7vw,5.25rem)]/[0.98] font-bold tracking-[-0.035em] text-balance text-brand-navy">
          Вопрос-<TitleAccent>ответ</TitleAccent>
        </h1>
        <p className="-mt-2.5 max-w-xl text-lg leading-[1.35] text-muted-foreground text-balance sm:text-xl">
          Собрали всё, о чём спрашивают до покупки.
        </p>
        {/* Быстрые переходы: страница длинная, а вопросы у всех разные */}
        <nav aria-label="Разделы вопросов" className="flex flex-wrap gap-2 pt-1">
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {group.title}
            </a>
          ))}
        </nav>
      </section>

      {FAQ_GROUPS.map((group, i) => (
        <section key={group.id} id={group.id} className="animate-rise scroll-mt-24 space-y-8">
          <SectionHead title={group.title} note={group.note} />
          <FaqAccordion items={group.items} startOpen={i === 0} />
        </section>
      ))}

      {/* Осталось что-то — пишите. Отдельно вынесен запрос на внедрение и сотрудничество */}
      <section className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        {/* Главный CTA страницы — бумага, рамка-рубашка и гусь: блок должен
            останавливать взгляд, а не растворяться в фоне. */}
        <div className="banner-goose-frame relative overflow-hidden rounded-3xl px-6 pt-8 pb-32 sm:px-9 sm:pt-10 sm:pb-36">
          <Image
            src="/banner-home-goose.webp"
            alt=""
            width={760}
            height={619}
            aria-hidden
            className="pointer-events-none absolute right-0 bottom-0 w-[150px] select-none sm:w-[220px]"
          />
          <div className="relative">
            <StickerTag tone="navy">без бота</StickerTag>
            <h2 className="mt-4 max-w-md font-heading text-[1.8rem]/[1.06] font-extrabold tracking-[-0.025em] text-balance text-brand-navy sm:text-[2.2rem]/[1.03]">
              Спросите напрямую — отвечает автор
            </h2>
            <p className="mt-3 max-w-sm leading-relaxed font-medium text-brand-charcoal/80 text-pretty">
              Опишите свою ситуацию в&nbsp;одном абзаце. Если обучение вам не&nbsp;нужно — так
              и&nbsp;скажем, это нормальный ответ.
            </p>
            <a
              href={TELEGRAM_DM}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-goose mt-6 inline-flex h-12 items-center gap-2 rounded-xl border-2 border-brand-navy px-6 text-[15px] font-extrabold tracking-tight text-brand-navy shadow-[0_3px_0_0_var(--color-goose-red)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_5px_0_0_var(--color-goose-red)] motion-reduce:hover:translate-y-0"
            >
              <Send className="size-4" aria-hidden />
              Написать в личку
            </a>
          </div>
        </div>

        <div className="rounded-3xl border-2 border-brand-navy/12 bg-brand-sky/45 px-6 py-8 sm:px-9 sm:py-10">
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-navy/12 text-brand-navy">
            <Briefcase className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 font-heading text-xl font-extrabold tracking-tight text-balance text-brand-navy sm:text-2xl">
            Бизнесу и&nbsp;командам
          </h2>
          <p className="mt-3 leading-relaxed font-medium text-brand-charcoal/80 text-pretty">
            Нужно внедрить ИИ в команду, обучить сотрудников или сделать что-то вместе — напишите с одним абзацем про задачу.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href={TELEGRAM_DM}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border-2 border-brand-navy/25 bg-brand-cream/85 px-5 text-sm font-bold text-brand-navy transition-colors hover:border-brand-navy/60"
            >
              <Briefcase className="size-3.5" aria-hidden />
              Обсудить внедрение
            </a>
            <Link
              href="/courses"
              className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-bold text-brand-navy/70 transition-colors hover:text-brand-navy"
            >
              Посмотреть обучения
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
