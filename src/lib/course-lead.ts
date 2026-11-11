import { plainText } from '@/lib/markdown';

type LeadPart = { text: string; underline?: 'green' | 'red' };

// Текст текущего хиро: один источник для видимого абзаца и Course.description.
export function getCourseLeadParts(slug: string): readonly LeadPart[] | null {
  if (slug === 'claude-code-agents') {
    return [
      { text: 'Установите Claude Code и научитесь ' },
      { text: 'автоматизировать', underline: 'green' },
      { text: ' свою работу.\nА также научитесь создавать своих агентов ' },
      { text: 'под любую задачу', underline: 'red' },
      { text: '.' },
    ];
  }
  if (slug === 'vibecoding' || slug === 'it-vibecoding') {
    return [
      { text: 'Обучаем ИИ правилам твоего репозитория: ' },
      { text: 'CLAUDE.md, rules, линтер, типы и тесты', underline: 'green' },
      { text: '.\nМодель сама исправляет ошибки по тестам и предлагает ' },
      { text: 'чистые изолированные коммиты', underline: 'green' },
      { text: '.' },
    ];
  }
  return null;
}

export function getCourseDescription(slug: string, lead: string): string {
  return getCourseLeadParts(slug)?.map((part) => part.text).join('') ?? plainText(lead);
}
