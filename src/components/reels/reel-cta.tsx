'use client';

import React from 'react';
import Link from 'next/link';
import { EVENTS, type ReelEventProps } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track-client';
import type { Reel } from '@/lib/reels';
import { ReelCourseLink } from './reel-course-link';

type ReelCtaProps = {
  title: string;
  courseSlug: string;
  eventProps: ReelEventProps;
  reel?: Reel;
};

export function ReelCta({ title, courseSlug, eventProps, reel }: ReelCtaProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold leading-snug text-white drop-shadow-md">
        {title}
      </h2>
      <div>
        {reel ? <ReelCourseLink reel={reel} eventProps={eventProps} /> : <Link
          href={`/courses/${courseSlug}`}
          onClick={() => track(EVENTS.reelCtaClicked, eventProps)}
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-lg transition-colors hover:bg-neutral-200 active:scale-95"
        >
          К курсу
        </Link>}
      </div>
    </div>
  );
}
