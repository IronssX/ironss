import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchShortVideoLikeState, setShortVideoLiked } from '@/services/shortVideoInteractionService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

export function useShortVideoLikes(videoId: string) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async () => {
    const state = await fetchShortVideoLikeState(videoId, user?.id ?? null);
    setLikeCount(state.count);
    setIsLiked(state.isLiked);
  }, [user?.id, videoId]);

  useEffect(() => {
    let isCurrent = true;
    setLikeCount(0);
    setIsLiked(false);
    setHasError(false);
    setIsLoading(Boolean(videoId));

    if (!videoId) return () => {
      isCurrent = false;
    };

    fetchShortVideoLikeState(videoId, user?.id ?? null)
      .then((state) => {
        if (!isCurrent) return;
        setLikeCount(state.count);
        setIsLiked(state.isLiked);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        logSupabaseFailure('short-video-likes', 'fetchLikeState', error);
        setHasError(true);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [user?.id, videoId]);

  const toggleLike = async () => {
    if (!user || isBusy) return;
    setIsBusy(true);
    setHasError(false);
    const nextIsLiked = !isLiked;

    try {
      await setShortVideoLiked(videoId, user.id, nextIsLiked);
      setIsLiked(nextIsLiked);
      setLikeCount((current) => Math.max(0, current + (nextIsLiked ? 1 : -1)));
      await refresh();
    } catch (error) {
      logSupabaseFailure('short-video-likes', 'toggleLike', error);
      setHasError(true);
    } finally {
      setIsBusy(false);
    }
  };

  return { likeCount, isLiked, isLoading, isBusy, hasError, toggleLike };
}
