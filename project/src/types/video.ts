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
export type VideoType = 'standard' | 'short';
export type VideoVisibility = 'public' | 'private';
export type VideoMimeType = 'video/mp4' | 'video/webm';

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
  mimeType?: VideoMimeType;
  videoType: VideoType;
  visibility: VideoVisibility;
  commentsEnabled: boolean;
  privacyTransitionPending: boolean;
  ownerId?: string;
}
