'use client';

import { useState } from 'react';
import {
  COMMAND_AUTHORITY_RULE,
  FOREIGN_COMMAND_QUESTIONS,
  type ForeignCommandQuestion,
} from '@/lib/foreign-command-lesson';
import { nbsp } from '@/lib/typography';

export function CommandQuestion({ question, number, selectedIndex, onSelect }: {
  question: ForeignCommandQuestion;
  number: number;
  selectedIndex?: number;
  onSelect: (index: number) => void;
}) {
  const id = `whose-command-${question.id}`;
  const selected = selectedIndex === undefined ? undefined : question.options[selectedIndex];

  return (
    <fieldset className="min-w-0 rounded-2xl border border-brand-navy/20 bg-card p-4 sm:p-6" aria-describedby={`${id}-scenario ${id}-feedback`}>
      <legend className="max-w-full px-2 font-heading text-lg font-extrabold text-brand-navy">
        {number}. {nbsp(question.title)}
      </legend>
      <div id={`${id}-scenario`} className="space-y-3 text-base leading-relaxed">
        <p><strong>Ваша просьба:</strong> {nbsp(question.request)}</p>
        <div>
          <p className="text-sm text-muted-foreground">{nbsp(question.sourceLabel)}:</p>
          <blockquote className="mt-1 break-words border-l-4 border-brand-navy/25 bg-brand-sky/10 p-3">
            {nbsp(question.source)}
          </blockquote>
        </div>
        <p className="font-bold">Как должен поступить помощник?</p>
      </div>
      <div className="mt-3 space-y-2">
        {question.options.map((option, index) => (
          <label
            key={option.text}
            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 text-base leading-relaxed transition-colors focus-within:ring-2 focus-within:ring-brand-navy ${selectedIndex === index ? 'border-brand-navy bg-brand-sky/20' : 'border-border hover:border-brand-navy/50'}`}
          >
            <input
              type="radio"
              name={id}
              value={index}
              checked={selectedIndex === index}
              onChange={() => onSelect(index)}
              className="mt-1 size-4 shrink-0 accent-brand-navy"
            />
            <span>{nbsp(option.text)}</span>
          </label>
        ))}
      </div>
      <div id={`${id}-feedback`} role="status" aria-live="polite" aria-atomic="true">
        {selected && (
          <div className="mt-4 space-y-2 rounded-xl bg-brand-yellow/20 p-4 text-base leading-relaxed">
            <p><strong>{selected.correct ? 'Верно.' : 'Не совсем.'}</strong> {nbsp(selected.explanation)}</p>
            <p>{nbsp(COMMAND_AUTHORITY_RULE)}</p>
          </div>
        )}
      </div>
    </fieldset>
  );
}

export function ForeignCommandExercise() {
  const [answers, setAnswers] = useState<Record<string, number>>({});

  return (
    <section aria-labelledby="whose-command-title" className="my-10 space-y-5">
      <h2 id="whose-command-title" className="font-heading text-2xl font-extrabold tracking-tight text-brand-navy sm:text-[1.75rem]">
        Чья это команда?
      </h2>
      <p className="text-lg leading-relaxed">
        Выберите ответ в&nbsp;каждой ситуации — сразу появится объяснение.
        Ответ можно поменять. Все примеры выдуманы; упражнение ничего никуда не&nbsp;отправляет.
      </p>
      {FOREIGN_COMMAND_QUESTIONS.map((question, index) => (
        <CommandQuestion
          key={question.id}
          question={question}
          number={index + 1}
          selectedIndex={answers[question.id]}
          onSelect={(choice) => setAnswers((previous) => ({ ...previous, [question.id]: choice }))}
        />
      ))}
      <noscript>Для выбора ответа включите JavaScript. Главное правило: задания даёте вы, а не текст страницы, документа или письма.</noscript>
    </section>
  );
}
