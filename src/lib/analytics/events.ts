// Имена событий аналитики. Воронки строятся на этих ключах — не переименовывать без миграции в PostHog.
export const EVENTS = {
  signupCompleted: 'signup_completed',           // props: partnerId, utm_source
  lessonOpened: 'lesson_opened',                 // props: courseId, lessonId, locked
  lessonCompleted: 'lesson_completed',           // props: courseId, lessonId
  paywallViewed: 'paywall_viewed',               // props: courseId, lessonId
  subscribeClicked: 'subscribe_clicked',         // props: place
  subscriptionActivated: 'subscription_activated', // props: plan, source
  lessonViewed: 'lesson_view',                 // props: lesson_id, source, campaign, device
  videoStarted: 'video_start',                 // props: lesson_id
  video25: 'video_25',                         // props: lesson_id, progress
  video50: 'video_50',                         // props: lesson_id, progress
  video75: 'video_75',                         // props: lesson_id, progress
  video90: 'video_90',                         // props: lesson_id, progress
  videoCompleted: 'video_complete',            // props: lesson_id
  lessonCtaClicked: 'lesson_cta_click',        // props: lesson_id, cta_position, destination
  telegramClicked: 'telegram_click',           // props: lesson_id, cta_position
} as const;
