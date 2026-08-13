'use server';
import { incrementTestCourseClick } from '@/lib/db/stats';

// Инкремент кликов по тестовому курсу (маркетинговый эксперимент на спрос).
// Публичный экшен — вызывается с любой карточки урока тестового курса, без авторизации.
export async function trackTestCourseClick(courseId: string) {
  await incrementTestCourseClick(courseId);
}
