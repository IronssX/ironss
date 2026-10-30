export const CATEGORIES = [
  'Music',
  'Coding',
  'Cooking',
  'Sports',
  'Art',
  'Nature',
  'Travel',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryFilter = 'All' | Category;

export interface Video {
  id: string;
  title: string;
  creator: string;
  category: Category | null;
  description: string;
  views: number;
  likes: number;
  uploadedAt: string;
  duration: string;
  thumbnailUrl: string;
  videoUrl: string;
  source?: 'uploaded';
  ownerId?: string;
}
