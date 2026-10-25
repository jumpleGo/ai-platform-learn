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

// Лимонная пилюля «кто мы» над окном: ведёт на главную — гостю там лендинг-джелатерия
export function StudentAbout() {
  return (
    <Link href="/" className={styles.about} onClick={() => goal(EVENTS.studentBannerClicked, { banner: 'about' })}>
      <span className={styles.aboutBadge} aria-hidden="true">
        <svg className={styles.aboutLemon} viewBox="0 0 32 32" width="25" height="25">
          <path
            d="M5.5 19.5c-1.8.1-2.4 2.3-.9 3.1 1 .5 1.9.3 2.5.8 2.6 3.6 8 4.8 12.6 2.6 4.8-2.3 7.4-7.3 6-11.7.4-.8.5-1.8-.2-2.6-.8-.9-1.9-.6-2.6-.9-3-3.3-8.3-4.2-12.8-2-4.6 2.2-6.8 6.6-4.6 10.7Z"
            fill="#FED453"
            stroke="#102647"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M10.5 15.5c1-1.7 2.6-2.8 4.4-3.2" fill="none" stroke="#FDFCEE" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M19.5 9.2c.2-3.4 2.9-6 7.2-6.2.1 4-2.6 6.6-7.2 6.2Z"
            fill="#9FD4AE"
            stroke="#102647"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>кто мы</span>
    </Link>
  );
}
