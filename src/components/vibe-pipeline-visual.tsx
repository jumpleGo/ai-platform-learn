'use client';

import React from 'react';

// Пункты левой и правой карточки идут парами: 1 против 1, 2 против 2, 3 против 3.
// На широком экране карточки лежат в subgrid, поэтому одинаковые номера стоят
// на одной высоте, даже если текст разной длины.
const CHAOS = [
  {
    title: '1. Каждый раз с чистого листа',
    note: <>Модель <strong className="font-black text-brand-navy">не помнит прошлые договорённости</strong>.</>,
  },
  {
    title: '2. Модель сама себе судья',
    note: <>ИИ пишет непроверенный код, уверяет что всё работает.</>,
  },
  {
    title: '3. Проверять нечем',
    note: <>Нет тестов и линтера — <strong className="font-black text-brand-navy">ошибки находишь ты сам, а не сабагенты.</strong></>,
  },
];

const SYSTEM = [
  {
    title: '1. Контекст вшит в репозиторий',
    note: <><strong className="font-black text-brand-forest">CLAUDE.md, rules и skills</strong> подгружаются автоматически.</>,
  },
  {
    title: '2. Автопроверки до коммита',
    note: <>TypeScript, линтер и автотесты прогоняются сами. <strong className="font-black text-brand-forest">ИИ видит ошибку и чинит её</strong>.</>,
  },
  {
    title: '3. Агенты',
    note: <>На готовый фундамент ложатся сабагенты и оркестрация. Ты <strong className="font-black text-brand-forest">принимаешь чистый Pull Request</strong>.</>,
  },
];

// Карточка — прямые дети: шапка, три пункта, итог. Обёрток нет, иначе subgrid не разложит их по строкам
const CARD_GRID = 'flex flex-col lg:grid lg:grid-rows-subgrid lg:row-span-5';

export function VibeComparisonSection() {
  return (
    <section className="animate-rise relative">
      <div className="sm:overflow-hidden sm:rounded-3xl sm:border-2 sm:border-brand-navy/20 sm:bg-card sm:shadow-[0_6px_0_0_rgba(16,38,71,0.08)]">
        {/* Шапка блока */}
        <div className="pb-4 sm:border-b-2 sm:border-brand-navy/10 sm:bg-brand-cream/60 sm:p-8">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-2xl sm:text-3xl font-black text-brand-navy leading-tight text-pretty">
              Почему одного Claude или Codex мало
            </h2>
          </div>
        </div>

        {/* Наглядное сравнение «Проект без настройки» vs «Проект, настроенный под ИИ» в стиле Gelato */}
        <div className="pt-2 sm:p-9">
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_auto_auto]">
            {/* Левая сторона: проект без настройки */}
            <div className={`${CARD_GRID} rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-8 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy`}>
              <div className="flex items-center justify-between border-b-2 border-brand-navy/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-lg bg-brand-red/10 border border-brand-red/25 px-2.5 py-1 font-mono text-xs font-black uppercase text-brand-red">
                    хаос
                  </span>
                  <span className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                    Проект без настройки
                  </span>
                </div>
                <span className="font-marker text-2xl text-brand-red">01</span>
              </div>

              {CHAOS.map((item, i) => (
                <div key={item.title} className={`space-y-1.5 ${i === 0 ? 'pt-6' : 'pt-5'}`}>
                  <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">{item.title}</h4>
                  <p className="text-[17px] sm:text-lg font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                    {item.note}
                  </p>
                </div>
              ))}

              <div className="mt-auto pt-6 sm:pt-8">
                <div className="rounded-2xl border-2 border-brand-navy/15 bg-brand-red/10 p-4 text-sm sm:text-base font-bold text-brand-navy leading-snug">
                  <strong className="text-brand-red">Итог:</strong> часы ручного дебага вместо новых фич.
                </div>
              </div>
            </div>

            {/* Правая сторона: проект, настроенный под ИИ */}
            <div className={`${CARD_GRID} rounded-3xl border-2 border-brand-navy bg-brand-yellow/30 p-6 sm:p-8 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all`}>
              <div className="flex items-center justify-between border-b-2 border-brand-navy/15 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center rounded-lg bg-brand-forest/20 border border-brand-forest/30 px-2.5 py-1 font-mono text-xs font-black uppercase text-brand-forest">
                    система
                  </span>
                  <span className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                    Проект, настроенный под ИИ
                  </span>
                </div>
                <span className="font-marker text-2xl text-brand-forest">02</span>
              </div>

              {SYSTEM.map((item, i) => (
                <div key={item.title} className={`space-y-1.5 ${i === 0 ? 'pt-6' : 'pt-5'}`}>
                  <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">{item.title}</h4>
                  <p className="text-[17px] sm:text-lg font-bold leading-relaxed text-brand-navy/90 text-pretty">
                    {item.note}
                  </p>
                </div>
              ))}

              <div className="mt-auto pt-6 sm:pt-8">
                <div className="rounded-2xl border-2 border-brand-navy bg-brand-forest text-brand-cream p-4 text-sm sm:text-base font-black leading-snug shadow-2xs">
                  <strong className="text-brand-yellow">Результат:</strong> проект, в котором ИИ работает хорошо.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
