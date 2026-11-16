/// <reference types="vite/client" />
import React from 'react';
import { createHash } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReelActions } from '@/components/reels/reel-actions';
import { normalizeReel } from '@/lib/reels';

const s = vi.hoisted(() => ({
  session: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/session', () => ({
  getSession: s.session,
}));

type ReelRecord = {
  id: string;
  published: boolean;
  likeCount?: number;
  [key: string]: unknown;
};

const dbState = {
  reels: new Map<string, ReelRecord>(),
  likes: new Map<string, Set<string>>(), // reelId -> Set of hashedUid
};

vi.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date(),
    },
  },
}));

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: (colName: string) => ({
      doc: (docId: string) => ({
        collection: (subColName: string) => ({
          doc: (subDocId: string) => ({
            path: `${colName}/${docId}/${subColName}/${subDocId}`,
            id: subDocId,
          }),
        }),
        path: `${colName}/${docId}`,
        id: docId,
      }),
    }),
    runTransaction: async (updateFunction: (tx: any) => Promise<any>) => {
      const tx = {
        get: async (ref: any) => {
          const parts = ref.path.split('/');
          if (parts.length === 2 && parts[0] === 'reels') {
            const reelId = parts[1];
            const data = dbState.reels.get(reelId);
            return {
              exists: Boolean(data),
              data: () => (data ? { ...data } : undefined),
            };
          }
          if (parts.length === 4 && parts[0] === 'reels' && parts[2] === 'likes') {
            const reelId = parts[1];
            const hash = parts[3];
            const reelLikes = dbState.likes.get(reelId);
            const exists = Boolean(reelLikes?.has(hash));
            return {
              exists,
              data: () => (exists ? { uidHash: hash } : undefined),
            };
          }
          return { exists: false, data: () => undefined };
        },
        set: (ref: any, _data: any) => {
          const parts = ref.path.split('/');
          if (parts.length === 4 && parts[0] === 'reels' && parts[2] === 'likes') {
            const reelId = parts[1];
            const hash = parts[3];
            if (!dbState.likes.has(reelId)) dbState.likes.set(reelId, new Set());
            dbState.likes.get(reelId)!.add(hash);
          }
        },
        delete: (ref: any) => {
          const parts = ref.path.split('/');
          if (parts.length === 4 && parts[0] === 'reels' && parts[2] === 'likes') {
            const reelId = parts[1];
            const hash = parts[3];
            dbState.likes.get(reelId)?.delete(hash);
          }
        },
        update: (ref: any, data: any) => {
          const parts = ref.path.split('/');
          if (parts.length === 2 && parts[0] === 'reels') {
            const reelId = parts[1];
            const existing = dbState.reels.get(reelId) || { id: reelId, published: true };
            dbState.reels.set(reelId, { ...existing, ...data });
          }
        },
      };
      return await updateFunction(tx);
    },
  },
}));

vi.mock('@/lib/db/reels', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/db/reels')>();
  return {
    ...actual,
  };
});

type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
const modules = import.meta.glob('../src/app/api/reels/*/like/route.ts', { eager: true });
const route = Object.values(modules)[0] as {
  POST?: Handler;
  resetRateLimit?: () => void;
} | undefined;

function sha256(val: string): string {
  return createHash('sha256').update(val).digest('hex');
}

async function callLike(reelId = 'reel-1'): Promise<Response> {
  expect(route, 'Reel like POST route is missing').toBeDefined();
  expect(route!.POST, 'POST handler is missing').toBeTypeOf('function');
  return route!.POST!(
    new Request(`https://gelato.education/api/reels/${reelId}/like`, {
      method: 'POST',
    }),
    { params: Promise.resolve({ id: reelId }) },
  );
}

describe('Reel like API #560', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    dbState.reels.clear();
    dbState.likes.clear();
    dbState.reels.set('reel-1', { id: 'reel-1', published: true, likeCount: 0 });
    route?.resetRateLimit?.();
  });

  it('fails on old code when route does not exist', () => {
    expect(route, 'Reel like POST route is missing').toBeDefined();
  });

  it('denies guest with 401', async () => {
    s.session.mockResolvedValue(null);
    const res = await callLike('reel-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for nonexistent or unpublished reel', async () => {
    s.session.mockResolvedValue({ uid: 'student-1' });
    const resMissing = await callLike('nonexistent-reel');
    expect(resMissing.status).toBe(404);

    dbState.reels.set('reel-unpublished', { id: 'reel-unpublished', published: false, likeCount: 0 });
    const resUnpub = await callLike('reel-unpublished');
    expect(resUnpub.status).toBe(404);
  });

  it('second call from same student toggles like off and restores previous count', async () => {
    s.session.mockResolvedValue({ uid: 'student-1' });

    // First call: like
    const res1 = await callLike('reel-1');
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1).toEqual({ liked: true, likeCount: 1 });
    expect(dbState.reels.get('reel-1')?.likeCount).toBe(1);
    expect(dbState.likes.get('reel-1')?.has(sha256('student-1'))).toBe(true);

    // Second call: unlike (does not increment, returns to previous)
    const res2 = await callLike('reel-1');
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2).toEqual({ liked: false, likeCount: 0 });
    expect(dbState.reels.get('reel-1')?.likeCount).toBe(0);
    expect(dbState.likes.get('reel-1')?.has(sha256('student-1'))).toBe(false);
  });

  it('different students have isolated documents and do not remove each other likes', async () => {
    // Student 1 likes
    s.session.mockResolvedValue({ uid: 'student-1' });
    const res1 = await callLike('reel-1');
    expect(res1.status).toBe(200);
    expect((await res1.json()).likeCount).toBe(1);

    // Student 2 likes
    s.session.mockResolvedValue({ uid: 'student-2' });
    const res2 = await callLike('reel-1');
    expect(res2.status).toBe(200);
    expect((await res2.json()).likeCount).toBe(2);

    const hash1 = sha256('student-1');
    const hash2 = sha256('student-2');
    expect(dbState.likes.get('reel-1')?.has(hash1)).toBe(true);
    expect(dbState.likes.get('reel-1')?.has(hash2)).toBe(true);

    // Student 2 unlikes
    const res3 = await callLike('reel-1');
    expect(res3.status).toBe(200);
    expect((await res3.json()).likeCount).toBe(1);

    // Student 1's like is preserved in its own document
    expect(dbState.likes.get('reel-1')?.has(hash1)).toBe(true);
    expect(dbState.likes.get('reel-1')?.has(hash2)).toBe(false);
  });

  it('rate limits student after 20 requests in window and responds with 429', async () => {
    s.session.mockResolvedValue({ uid: 'student-spammer' });

    // 20 requests succeed
    for (let i = 0; i < 20; i++) {
      const res = await callLike('reel-1');
      expect(res.status).toBe(200);
    }

    // 21st request hits rate limit
    const resBlocked = await callLike('reel-1');
    expect(resBlocked.status).toBe(429);
  });

  it('adds likeCount to reel data with default 0', () => {
    const reel = normalizeReel(
      { id: 'reel-1', courseSlug: 'claude-code-agents', videoPath: 'v.mp4', order: 0, published: true },
      { title: 'Claude Code' },
    );
    expect(reel.likeCount).toBe(0);
  });

  it('renders heart and counter for logged-in user in reel-actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReelActions, {
        eventProps: { reel_id: 'reel-1', course_slug: 'claude-code-agents', position: 0 },
        initialLikeCount: 12,
        isLoggedIn: true,
      }),
    );
    expect(html).toContain('12');
    expect(html).toMatch(/<button[^>]*aria-label="Лайк"[^>]*>/);
  });

  it('renders counter and login invitation link for guest in reel-actions', () => {
    const html = renderToStaticMarkup(
      React.createElement(ReelActions, {
        eventProps: { reel_id: 'reel-1', course_slug: 'claude-code-agents', position: 0 },
        initialLikeCount: 42,
        isLoggedIn: false,
      }),
    );
    expect(html).toContain('42');
    expect(html).toContain('Войти, чтобы поставить лайк');
    expect(html).toMatch(/href="\/login"[^>]*>[\s\S]*?Войти, чтобы поставить лайк<\/a>/);
  });
});
