import { useEffect, useState } from 'react';
import { getLikedVideoIds, setVideoLiked } from '@/utils/likeStorage';

export function useVideoLike(videoId: string) {
  const [isLiked, setIsLiked] = useState(() => getLikedVideoIds().includes(videoId));

  useEffect(() => {
    setIsLiked(getLikedVideoIds().includes(videoId));
  }, [videoId]);

  const toggleLike = () => {
    const nextIsLiked = !isLiked;
    setIsLiked(nextIsLiked);
    setVideoLiked(videoId, nextIsLiked);
  };

  return { isLiked, toggleLike };
}
