// Имена событий аналитики. Воронки строятся на этих ключах — не переименовывать без миграции в PostHog.
export const EVENTS = {
  signupCompleted: 'signup_completed',           // props: partnerId, utm_source
  lessonOpened: 'lesson_opened',                 // props: courseId, lessonId, locked
  lessonCompleted: 'lesson_completed',           // props: courseId, lessonId
  paywallViewed: 'paywall_viewed',               // props: courseId, lessonId
  subscribeClicked: 'subscribe_clicked',         // props: place
  subscriptionActivated: 'subscription_activated', // props: plan, amount, tariffId, courseSlug, hasSupport, source
  lessonViewed: 'lesson_view',                 // props: lesson_id, source, campaign, device
  videoStarted: 'video_start',                 // props: lesson_id
  video25: 'video_25',                         // props: lesson_id, progress
  video50: 'video_50',                         // props: lesson_id, progress
  video75: 'video_75',                         // props: lesson_id, progress
  video90: 'video_90',                         // props: lesson_id, progress
  videoCompleted: 'video_complete',            // props: lesson_id
  lessonCtaClicked: 'lesson_cta_click',        // props: lesson_id, cta_position, destination
  telegramClicked: 'telegram_click',           // props: lesson_id, cta_position
  quizStarted: 'quiz_started',                 // props: place
  quizCompleted: 'quiz_completed',             // props: result_slug
  homeViewed: 'home_view',                     // props: variant (A/B главной)
  pricingViewed: 'pricing_viewed',             // props: courseSlug, place — блок тарифов попал в экран
  tariffSelected: 'tariff_selected',           // props: tariffId, price, courseSlug, place
  paymentStarted: 'payment_started',           // props: tariffId, price, courseSlug — сабмит формы оплаты, не клик по CTA
  paymentResultViewed: 'payment_result_viewed', // props: result, referrerHost, returnedFromTBank — возврат с платёжной страницы
  paymentStatusChecked: 'payment_status_checked', // props: status, confirmed, courseSlug — только при смене статуса
  experimentExposed: 'experiment_exposed',     // props: experiment, variant — посетитель увидел тестируемый элемент
} as const;
