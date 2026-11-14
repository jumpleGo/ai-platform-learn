// Match the raw upload endpoint and nginx client_max_body_size 10m.
export const MAX_REEL_BYTES = 10 * 1024 * 1024;

export type Reel = {
  id: string;
  title: string;
  courseSlug: string;
  videoPath: string;
  posterPath?: string;
  order: number;
  published: boolean;
};
