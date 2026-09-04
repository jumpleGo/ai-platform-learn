'use client';

import React from 'react';
import { Bot, Terminal, ShieldCheck, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, XCircle } from 'lucide-react';

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
            <p className="mt-1 text-base sm:text-lg font-medium text-brand-charcoal/85 max-w-3xl">
              Модель одна и та же у всех. Разница — в том, насколько проект к ней подготовлен: правила, тесты, контекст.
            </p>
          </div>
        </div>

        {/* Наглядное сравнение «Проект без настройки» vs «Проект, настроенный под ИИ» в стиле Gelato */}
        <div className="pt-2 sm:p-9">
          <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
            {/* Левая сторона: проект без настройки */}
            <div className="flex flex-col justify-between rounded-3xl border-2 border-brand-navy/15 bg-card p-6 sm:p-8 shadow-[0_4px_0_0_rgba(16,38,71,0.06)] transition-all hover:border-brand-navy">
              <div>
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

                <div className="mt-6 space-y-5">
                  <div className="space-y-1.5">
                    <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      1. Каждый раз с чистого листа
                    </h4>
                    <p className="text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      Модель <strong className="font-black text-brand-navy">не помнит прошлые договорённости</strong>. Ты тратишь часы на пересказ структуры и стека в каждом новом окне.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      2. Модель сама себе судья
                    </h4>
                    <p className="text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      ИИ пишет непроверенный код, уверяет что всё работает, а <strong className="font-black text-brand-navy">на проде всё падает</strong> из-за сломанных типов и связей.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      3. Проверять нечем
                    </h4>
                    <p className="text-base sm:text-[17px] font-medium leading-relaxed text-brand-charcoal/90 text-pretty">
                      Нет тестов и линтера — <strong className="font-black text-brand-navy">ошибки находишь ты, а не машина</strong>. Каждый фикс проверяешь руками и ловишь регрессии на проде.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 rounded-2xl border-2 border-brand-navy/15 bg-brand-red/10 p-4 text-sm sm:text-base font-bold text-brand-navy leading-snug">
                <strong className="text-brand-red">Тупик:</strong> часы ручного дебага, усталость и риск остаться не у дел.
              </div>
            </div>

            {/* Правая сторона: проект, настроенный под ИИ */}
            <div className="flex flex-col justify-between rounded-3xl border-2 border-brand-navy bg-brand-yellow/30 p-6 sm:p-8 shadow-[0_6px_0_0_rgba(16,38,71,0.12)] transition-all">
              <div>
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

                <div className="mt-6 space-y-5">
                  <div className="space-y-1.5">
                    <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      1. Контекст вшит в репозиторий
                    </h4>
                    <p className="text-base sm:text-[17px] font-bold leading-relaxed text-brand-navy/90 text-pretty">
                      <strong className="font-black text-brand-forest">CLAUDE.md, rules и skills</strong> подгружаются автоматически. ИИ знает стек и договорённости без пересказа.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      2. Автопроверки до показа тебе
                    </h4>
                    <p className="text-base sm:text-[17px] font-bold leading-relaxed text-brand-navy/90 text-pretty">
                      TypeScript, линтер и автотесты прогоняются сами. <strong className="font-black text-brand-forest">ИИ видит ошибку и чинит её</strong> до зелёного статуса.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-heading text-lg sm:text-xl font-black text-brand-navy">
                      3. Агенты — сверху, а не вместо
                    </h4>
                    <p className="text-base sm:text-[17px] font-bold leading-relaxed text-brand-navy/90 text-pretty">
                      На готовый фундамент ложатся сабагенты и оркестрация. Ты <strong className="font-black text-brand-forest">принимаешь чистый Pull Request</strong> в 10 раз быстрее.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 sm:mt-8 rounded-2xl border-2 border-brand-navy bg-brand-forest text-brand-cream p-4 text-sm sm:text-base font-black leading-snug shadow-2xs">
                <strong className="text-brand-yellow">Результат:</strong> проект, в котором ИИ работает хорошо, а ты сдаёшь продукт.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

