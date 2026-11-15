import { expect } from 'vitest';

// Independent of src/lib/analytics/events.ts: a production rename must fail here.
export const ANALYTICS_CONTRACT = {
  lesson_view: {
    required: ['courseId', 'lessonDocumentId', 'lesson_id', 'source', 'campaign', 'device'],
    optional: [],
    types: {
      courseId: 'string', lessonDocumentId: 'string', lesson_id: 'string',
      source: 'string', campaign: 'string', device: 'string',
    },
  },
  lesson_next_click: {
    required: ['course', 'lesson', 'target'],
    optional: ['to_lesson'],
    types: { course: 'string', lesson: 'number', target: 'string', to_lesson: 'number' },
  },
  first_touch: [
    'first_touch_utm_source', 'first_touch_referrer',
    'first_touch_referring_domain', 'first_touch_pathname',
  ],
} as const;

export const ANALYTICS_FIXTURES = {
  // #340 rejected schema, src/components/next-lesson-link.tsx:17-19 at this commit.
  // Literal output for courseSlug=vibecoding, fromLesson=1, toLesson=2.
  broken340: {
    commit: 'fcba116de7ce6d3f50b37d29f0d9af4b87297fc9',
    json: '{"course_slug":"vibecoding","from_lesson":1,"to_lesson":2}',
    sha256: '0b17d35837586a8958e0441d360dd8a93f8c0017279ecd321c3b55bb8815d59a',
  },
  // src/lib/analytics/posthog-client.tsx:29-34 at this commit, with these inputs.
  // Hashes cover the literal UTF-8 JSON bytes, without a trailing newline.
  firstTouch: {
    commit: 'ca590169a2ee6939a18a7c910097156d9f5615b7',
    url: 'https://gelato.education/courses/vibecoding/lessons/1?utm_source=google',
    referrer: 'https://www.google.com/search?q=gelato',
    json: '{"first_touch_utm_source":"google","first_touch_referrer":"https://www.google.com/search?q=gelato","first_touch_referring_domain":"www.google.com","first_touch_pathname":"/courses/vibecoding/lessons/1"}',
    sha256: 'a86e35fc1780f1e5c919ccf8880d578372c683b7c5efba0f9708c7927d8e0d1e',
  },
} as const;

type PropertyContract = {
  required: readonly string[];
  optional: readonly string[];
  types: Readonly<Record<string, 'string' | 'number'>>;
};
type EventName = Exclude<keyof typeof ANALYTICS_CONTRACT, 'first_touch'>;

function assertProperties(props: unknown, schema: PropertyContract) {
  expect(props).toBeTypeOf('object');
  expect(props).not.toBeNull();
  expect(Array.isArray(props)).toBe(false);
  const properties = props as Record<string, unknown>;
  expect(
    Object.keys(properties).filter(key => !schema.optional.includes(key)).sort(),
    'required analytics keys',
  ).toEqual([...schema.required].sort());
  for (const [key, value] of Object.entries(properties)) {
    expect(value, `analytics property ${key}`).toBeTypeOf(schema.types[key]);
  }
}

export function assertEventContract(event: string, props: unknown) {
  const names = Object.keys(ANALYTICS_CONTRACT).filter(name => name !== 'first_touch');
  expect(names, 'analytics event name').toContain(event);
  assertProperties(props, ANALYTICS_CONTRACT[event as EventName]);
}

export function assertFirstTouchContract(props: unknown) {
  const required = ANALYTICS_CONTRACT.first_touch;
  assertProperties(props, {
    required, optional: [],
    types: Object.fromEntries(required.map(key => [key, 'string' as const])),
  });
}
