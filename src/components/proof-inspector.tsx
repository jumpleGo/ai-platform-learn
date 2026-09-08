'use client';

import React, { useState } from 'react';
import { Check, Code2, FileCode2, ShieldCheck } from 'lucide-react';

export function ProofInspector() {
  const [activeTab, setActiveTab] = useState<'context' | 'diff' | 'checks'>('diff');

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border-2 border-brand-navy/20 bg-brand-navy text-brand-cream shadow-inner">
      {/* Верхний тулбар инспектора в стиле IDE / терминала */}
      <div className="flex flex-wrap items-center justify-between border-b border-brand-cream/15 bg-brand-navy/90 px-4 py-2.5 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="size-3 rounded-full bg-[#FF5F56] border border-black/20" />
          <span className="size-3 rounded-full bg-[#FFBD2E] border border-black/20" />
          <span className="size-3 rounded-full bg-[#27C93F] border border-black/20" />
          <span className="ml-2 font-mono text-xs font-bold text-brand-cream/60 hidden sm:inline">
            инспектор артефактов: коммит 187501d
          </span>
        </div>

        {/* Вкладки переключения доказательств */}
        <div className="flex items-center gap-1 rounded-lg bg-brand-cream/10 p-1 font-mono text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('context')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
              activeTab === 'context'
                ? 'bg-brand-yellow text-brand-navy font-black shadow-xs'
                : 'text-brand-cream/75 hover:text-brand-cream hover:bg-brand-cream/5'
            }`}
          >
            <FileCode2 className="size-3.5" />
            1. Правила (CLAUDE.md)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
              activeTab === 'diff'
                ? 'bg-brand-yellow text-brand-navy font-black shadow-xs'
                : 'text-brand-cream/75 hover:text-brand-cream hover:bg-brand-cream/5'
            }`}
          >
            <Code2 className="size-3.5" />
            2. Реальный diff
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checks')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all ${
              activeTab === 'checks'
                ? 'bg-brand-yellow text-brand-navy font-black shadow-xs'
                : 'text-brand-cream/75 hover:text-brand-cream hover:bg-brand-cream/5'
            }`}
          >
            <ShieldCheck className="size-3.5" />
            3. Автопроверки
          </button>
        </div>
      </div>

      {/* Тело вкладки */}
      <div className="p-4 sm:p-5 font-mono text-xs sm:text-[13px] leading-relaxed">
        {activeTab === 'context' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-brand-cream/60 pb-2 border-b border-brand-cream/10">
              <span>Файл: <strong className="text-brand-cream">CLAUDE.md</strong> (загружается агентом в память)</span>
              <span className="text-[11px] bg-brand-forest/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                Контекст проекта
              </span>
            </div>
            <pre className="text-brand-cream/90 overflow-x-auto whitespace-pre font-mono p-1">
{`# Репозиторий: ai-platform-learn (Next.js 15, React 19, TypeScript)

## Архитектурные ограничения для моделей
- Никаких правок в src/lib/db/* без явного запроса пользователя.
- Не сбрасывать состояние модалки при фоновых обновлениях тарифов.
- Обязательно: npm run lint && npx vitest run перед предложением коммита.
- Всегда отдавать минимальный изолированный патч.`}
            </pre>
            <div className="mt-3 rounded-lg bg-brand-cream/5 p-3 text-xs text-brand-cream/80 font-sans border border-brand-cream/10">
              💡 <strong>Что это даёт:</strong> модель не фантазирует архитектуру заново в каждом чате и знает точные правила репозитория ещё до написания первой строчки.
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-brand-cream/60 pb-2 border-b border-brand-cream/10">
              <span>Патч: <strong className="text-brand-cream">src/components/payment/payment-modal.tsx</strong></span>
              <span className="text-[11px] font-bold text-brand-yellow">
                +13 строк / −6 строк (изолированно)
              </span>
            </div>
            <div className="overflow-x-auto space-y-0.5 font-mono text-[12px] sm:text-[12.5px]">
              <div className="text-brand-cream/50">@@ -55,10 +55,11 @@ export function PaymentModal &#123;</div>
              <div className="text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded-xs">
                -  const tariffs = getTariffsForCourse(courseSlug, &#123; isVibeTimerExpired, testRub &#125;);
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +  // Мемоизируем: иначе новый массив на каждом рендере сбрасывал выбранный тариф
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +  const tariffs = useMemo(
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +    () =&gt; getTariffsForCourse(courseSlug, &#123; isVibeTimerExpired, testRub &#125;),
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +    [courseSlug, vibeTimer.isExpired, testRub],
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +  );
              </div>
              <div className="text-brand-cream/50 pt-1">@@ -133,7 +134,13 @@ useEffect(() =&gt; &#123;</div>
              <div className="text-rose-300 bg-rose-950/40 px-2 py-0.5 rounded-xs">
                -  &#125;, [isOpen, courseSlug, defaultTariffId, tariffs, testRub, vibeTimer.isExpired]);
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +  // сброс к тарифу по умолчанию только при открытии модалки или смене курса
              </div>
              <div className="text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-xs">
                +  &#125;, [isOpen, courseSlug, defaultTariffId]);
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-brand-cream/5 p-3 text-xs text-brand-cream/80 font-sans border border-brand-cream/10">
              💡 <strong>Что это даёт:</strong> ИИ не переписывает весь файл целиком и не ломает соседнюю логику — изменения точечные и безопасные.
            </div>
          </div>
        )}

        {activeTab === 'checks' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-brand-cream/60 pb-2 border-b border-brand-cream/10">
              <span>Защитная сетка до коммита</span>
              <span className="text-[11px] bg-brand-forest/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-400/30">
                Все проверки пройдены
              </span>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between rounded-lg bg-brand-cream/10 px-3.5 py-2">
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400" />
                  <span className="font-bold text-brand-cream">TypeScript v5.8 tsc --noEmit</span>
                </div>
                <span className="text-emerald-400 font-mono text-xs">0 errors</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-brand-cream/10 px-3.5 py-2">
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400" />
                  <span className="font-bold text-brand-cream">ESLint (Next core-web-vitals)</span>
                </div>
                <span className="text-emerald-400 font-mono text-xs">clean</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-brand-cream/10 px-3.5 py-2">
                <div className="flex items-center gap-2.5">
                  <Check className="size-4 text-emerald-400" />
                  <span className="font-bold text-brand-cream">Vitest test suite</span>
                </div>
                <span className="text-emerald-400 font-mono text-xs">12 passed (1.4s)</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-brand-cream/5 p-3 text-xs text-brand-cream/80 font-sans border border-brand-cream/10">
              💡 <strong>Что это даёт:</strong> если модель допустит синтаксическую ошибку или сломает контракт типов, она сама видит лог упавших тестов и исправляет код до того, как вы взглянете на diff.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
