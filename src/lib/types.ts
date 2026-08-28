export type Role = 'user' | 'admin';
export type Access = 'free' | 'paid';

export interface UserDoc {
  email: string;
  displayName: string;
  role: Role;
  partnerId: string | null;
  utm: Record<string, string> | null;
  createdAt: number;
}

export interface Course {
  id: string;
  // Человекочитаемый идентификатор для URL: /courses/<slug>, /waitlist/<slug>
  slug: string;
  title: string;
  description: string;
  coverUrl: string | null;
  order: number;
  published: boolean;
  access: Access;
  // Курс-пустышка без реального доступа (маркетинговый эксперимент на спрос)
  isTest: boolean;
  // Текст тоста при клике по уроку тестового курса; пусто — используется дефолт
  testToastMessage: string | null;
  // Сырой HTML лендинга предзаписи (/waitlist/[courseSlug]); вставляется как есть
  testLandingHtml: string | null;
  // Показать тег рядом с названием курса на витрине
  showBadge: boolean;
  // Текст тега; пусто — тег не рендерится, даже если showBadge=true
  badgeText: string | null;
  // Подсветка фона полки курса на 100% ширины экрана
  highlightBackground: boolean;
  // Счётчик кликов по тестовому курсу
  clickCount: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  videoEmbedUrl: string;
  durationSec: number | null;
  order: number;
  access: Access;
  // Снятый с публикации урок не показывается нигде и отдаёт 404 по прямой ссылке.
  // У старых уроков поля нет — undefined читается как опубликованный
  published: boolean;
  // Markdown-материалы урока (конспект, ссылки, горячие клавиши); рендерятся компонентом Markdown
  materials: string;
  // Накопленное число просмотров — растёт при открытии урока
  views: number;
  // Своя загруженная обложка-превью; null — берём кадр из видео
  previewImageUrl: string | null;
  // Короткая надпись поверх обложки на витрине бесплатных материалов; null — обложка чистая
  coverCaption: string | null;
  // Фокус-режим: убирают обвязку страницы, чтобы с урока некуда было уйти
  hideHeader: boolean;
  hideFooter: boolean;
  hideBackLink: boolean;
  hideLessonsNav: boolean;
  // Варианты маркетингового баннера в зоне материалов урока (A/B-тест)
  marketingVariants: LessonBanner[];
  // Варианты сопутствующих блоков в самом низу урока — уводят дальше по воронке
  relatedVariants: LessonBanner[];
  // Устаревшие одиночные поля HTML: читаем у уроков, которые ещё не пересохраняли
  // после появления вариантов. При сохранении из админки затираются в null.
  marketingHtml: string | null;
  relatedHtml: string | null;
}

// Вариант маркетингового блока урока. Показы делятся пропорционально weight,
// назначение залипает за посетителем — см. lib/banners.
export interface LessonBanner {
  // 'a' | 'b' | 'c' | 'd' — фиксированный набор, он же ключ счётчиков
  id: string;
  name: string;
  html: string;
  // Доля показов. 0 — вариант выключен
  weight: number;
}

export interface Partner {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string | null;
  active: boolean;
}

export interface Subscription {
  status: 'active' | 'expired';
  plan: string;
  source: 'manual' | 'payment' | 'b2b';
  startsAt: number;
  expiresAt: number | null;
  grantedBy: string | null;
  // Курсы, к которым открыт доступ. null — доступ ко всем курсам (полная подписка)
  courseIds: string[] | null;
}

// Доступ, выданный на email до регистрации пользователя. Применяется при регистрации
// (claimPendingGrant). periodDays === null — бессрочно; срок отсчитывается от момента активации.
export interface PendingGrant {
  email: string;
  plan: string;
  periodDays: number | null;
  partnerId: string | null;
  // Курсы доступа; null — все курсы (см. Subscription.courseIds)
  courseIds: string[] | null;
  grantedBy: string;
  createdAt: number;
}
