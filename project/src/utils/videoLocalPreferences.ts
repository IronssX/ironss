function readVideoIds(storageKey: string): string[] {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch (error) {
    console.warn(`[IRONSS] ${storageKey} could not be read; starting with none.`, error);
    return [];
  }
}

function updateVideoIds(storageKey: string, videoId: string, selected: boolean): boolean {
  const ids = new Set(readVideoIds(storageKey));
  if (selected) ids.add(videoId);
  else ids.delete(videoId);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...ids]));
    return true;
  } catch (error) {
    console.warn(`[IRONSS] ${storageKey} could not be saved in this browser.`, error);
    return false;
  }
}

export function getDislikedVideoIds(): string[] {
  return readVideoIds('ironss:disliked-videos');
}

export function setVideoDisliked(videoId: string, disliked: boolean): boolean {
  return updateVideoIds('ironss:disliked-videos', videoId, disliked);
}

export function getSavedVideoIds(): string[] {
  return readVideoIds('ironss:saved-videos');
}

export function setVideoSaved(videoId: string, saved: boolean): boolean {
  return updateVideoIds('ironss:saved-videos', videoId, saved);
}
