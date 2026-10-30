import { useState } from 'react';
import { getLikedVideoIds, setVideoLiked } from '@/utils/likeStorage';

export function useVideoLike(videoId: string) {
  const [isLiked, setIsLiked] = useState(() => getLikedVideoIds().includes(videoId));

  const toggleLike = () => {
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setVideoLiked(videoId, nextIsLiked);
  };

  return { isLiked, toggleLike };
}
