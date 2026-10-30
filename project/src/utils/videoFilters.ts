import type { CategoryFilter, Video } from '@/types/video';

function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function filterVideos(videos: Video[], query: string, category: CategoryFilter): Video[] {
  const normalizedQuery = normalizeForSearch(query.trim());

  return videos.filter((video) => {
    const matchesCategory = category === 'All' || video.category === category;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    return normalizeForSearch(video.title).includes(normalizedQuery);
  });
}
