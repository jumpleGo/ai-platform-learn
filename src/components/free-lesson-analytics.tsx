'use client';

import { useEffect } from 'react';
import { EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';

export function FreeLessonAnalytics({
  courseId,
  lessonDocumentId,
  lessonId,
  source,
  campaign,
}: {
  courseId: string;
  lessonDocumentId: string;
  lessonId: string;
  source: string;
  campaign: string;
}) {
  useEffect(() => {
    const width = window.innerWidth;
    const device = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    track(EVENTS.lessonViewed, {
      courseId,
      lessonDocumentId,
      lesson_id: lessonId,
      source,
      campaign,
      device,
    });
  }, [campaign, courseId, lessonDocumentId, lessonId, source]);

  return null;
}
