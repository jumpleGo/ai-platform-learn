import type { ComponentType } from 'react';
import { Target, BookOpen, FileDiff, ShieldCheck, Eye, type LucideProps } from 'lucide-react';
import type { IconKey } from '@/lib/course-landings';

// Иконки по ключу из контента: контент лежит в lib без React, набор иконок — здесь.
// Используются только в схеме цикла коммита; карточки идут без иконок
const ICONS: Record<IconKey, ComponentType<LucideProps>> = {
  target: Target,
  book: BookOpen,
  diff: FileDiff,
  shield: ShieldCheck,
  eye: Eye,
};

export function LandingIcon({ name, className = 'size-5' }: { name: IconKey; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={className} strokeWidth={2.25} aria-hidden />;
}
