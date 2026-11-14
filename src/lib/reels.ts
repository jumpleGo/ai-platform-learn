export type Reel = {
  id: string;
  title: string;
  courseSlug: string;
  videoPath: string;
  posterPath?: string;
  order: number;
  published: boolean;
};
