export const VIDEO_UPLOAD_LIMITS = {
  maxVideoBytes: 100 * 1024 * 1024,
  maxThumbnailBytes: 5 * 1024 * 1024,
  maxTitleLength: 120,
  maxDescriptionLength: 2000,
  videoTypes: ['video/mp4', 'video/webm'],
  thumbnailTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const VIDEO_TYPE_EXTENSIONS: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
