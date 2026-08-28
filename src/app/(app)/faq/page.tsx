import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Send } from 'lucide-react';
import { FAQ_GROUPS } from '@/lib/faq-content';
import { SITE_URL, TELEGRAM_DM } from '@/lib/site';
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
    <div className="space-y-16 sm:space-y-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()).replace(/</g, '\\u003c') }}
      />

      <section className="animate-rise relative space-y-5 pt-4 sm:pt-8">
        <DoodleWord
          text="без воды"
          color="oklch(0.535 0.1893 28.3)"
          className="z-10 -top-1 right-2 text-xl -rotate-6 sm:text-2xl"
        />
        <p className="font-mono text-sm text-primary">$ вопрос-ответ · {total}</p>
        <h1 className="max-w-2xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-5xl/[1.1]">
          Вопрос-ответ
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
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
        <section key={group.id} id={group.id} className="animate-rise scroll-mt-24 space-y-5">
          <SectionHead eyebrow={`0${i + 1}`} title={group.title} note={group.note} />
          <FaqAccordion items={group.items} startOpen={i === 0} />
        </section>
      ))}

      {/* Осталось что-то — пишите. Отдельно вынесен запрос на внедрение и сотрудничество */}
      <section className="animate-rise grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-brand-yellow px-6 py-8 sm:px-9 sm:py-10">
          <p className="font-mono text-sm text-brand-charcoal/70">остались вопросы</p>
          <h2 className="mt-2 max-w-md font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Спросите напрямую — отвечает автор, а&nbsp;не&nbsp;бот
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-brand-charcoal/75 text-pretty">
            Опишите свою ситуацию в&nbsp;одном абзаце. Если обучение вам не&nbsp;нужно — так
            и&nbsp;скажем, это нормальный ответ.
          </p>
          <a
            href={TELEGRAM_DM}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            <Send className="size-4" aria-hidden />
            Написать в личку
          </a>
        </div>

        <div className="rounded-3xl border border-border bg-secondary/60 px-6 py-8 sm:px-9 sm:py-10">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Briefcase className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight text-balance sm:text-2xl">
            Бизнесу и&nbsp;командам
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
            Нужно внедрить ИИ в команду, обучить сотрудников или сделать что-то вместе — напишите с одним абзацем про задачу.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <a
              href={TELEGRAM_DM}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-medium transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Briefcase className="size-3.5" aria-hidden />
              Обсудить внедрение
            </a>
            <Link
              href="/courses"
              className="inline-flex h-10 items-center rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Посмотреть обучения
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
