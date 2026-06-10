// Имена событий аналитики. Воронки строятся на этих ключах — не переименовывать без миграции в PostHog.
export const EVENTS = {
  signupCompleted: 'signup_completed',           // props: partnerId, utm_source
  lessonOpened: 'lesson_opened',                 // props: courseId, lessonId, locked
  lessonCompleted: 'lesson_completed',           // props: courseId, lessonId
  paywallViewed: 'paywall_viewed',               // props: courseId, lessonId
  subscribeClicked: 'subscribe_clicked',         // props: place
  subscriptionActivated: 'subscription_activated', // props: plan, source
} as const;
