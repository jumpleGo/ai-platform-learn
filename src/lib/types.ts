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
  title: string;
  description: string;
  coverUrl: string | null;
  order: number;
  published: boolean;
  access: Access;
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
}
