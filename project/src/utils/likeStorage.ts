const STORAGE_KEY = 'ironss:liked-videos';

export function getLikedVideoIds(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.warn('[IRONSS] Saved likes could not be read; starting with none.', error);
    return [];
  }
}

export function setVideoLiked(videoId: string, isLiked: boolean): void {
  const likedIds = new Set(getLikedVideoIds());
  if (isLiked) {
    likedIds.add(videoId);
  } else {
    likedIds.delete(videoId);
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...likedIds]));
  } catch (error) {
    console.warn('[IRONSS] Like could not be saved to this browser.', error);
  }
}
