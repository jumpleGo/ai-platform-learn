'use client';
import Link from 'next/link';
import { EVENTS } from '@/lib/analytics/events';
import { PROGRAM_URL } from '@/lib/site';
import { goal } from './student-install';
import styles from './student.module.css';

// Две тихие карточки под окном: курс и бесплатные уроки
const BANNERS = [
  {
    id: 'vibecoding',
    href: PROGRAM_URL,
    label: 'курс',
    title: 'Инженерный вайбкодинг',
    text: 'Агенты пишут код по правилам твоего проекта',
    tone: styles.bannerSky,
  },
  {
    id: 'free',
    href: '/free',
    label: 'бесплатно',
    title: 'Бесплатные уроки',
    text: 'Как объяснить ИИ задачу и проверить результат',
    tone: styles.bannerYellow,
  },
] as const;

export function StudentBanners() {
  return (
    <nav className={styles.banners} aria-label="Ещё от GELATO">
      {BANNERS.map((b) => (
        <Link
          key={b.id}
          href={b.href}
          className={`${styles.banner} ${b.tone}`}
          onClick={() => goal(EVENTS.studentBannerClicked, { banner: b.id })}
        >
          <span className={styles.bannerLabel}>{b.label}</span>
          <span className={styles.bannerTitle}>
            {b.title} <span className={styles.bannerArrow} aria-hidden="true">→</span>
          </span>
          <span className={styles.bannerText}>{b.text}</span>
        </Link>
      ))}
    </nav>
  );
}
