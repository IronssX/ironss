import { useEffect, useState } from 'react';
import {
  getDislikedVideoIds,
  getSavedVideoIds,
  setVideoDisliked,
  setVideoSaved,
} from '@/utils/videoLocalPreferences';

export function useVideoLocalPreferences(videoId: string) {
  const [isDisliked, setIsDisliked] = useState(() => getDislikedVideoIds().includes(videoId));
  const [isSaved, setIsSaved] = useState(() => getSavedVideoIds().includes(videoId));

  useEffect(() => {
    setIsDisliked(getDislikedVideoIds().includes(videoId));
    setIsSaved(getSavedVideoIds().includes(videoId));
  }, [videoId]);

  const toggleDislike = (): boolean => {
    const next = !isDisliked;
    if (!setVideoDisliked(videoId, next)) return false;
    setIsDisliked(next);
    return true;
  };

  const clearDislike = (): boolean => {
    if (!isDisliked) return true;
    if (!setVideoDisliked(videoId, false)) return false;
    setIsDisliked(false);
    return true;
  };

  const toggleSaved = (): boolean => {
    const next = !isSaved;
    if (!setVideoSaved(videoId, next)) return false;
    setIsSaved(next);
    return true;
  };

  return { isDisliked, isSaved, toggleDislike, clearDislike, toggleSaved };
}
