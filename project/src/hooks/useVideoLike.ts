import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchVideoLikeState, setVideoLiked } from '@/services/videoLikeService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

export function useVideoLike(videoId: string) {
  const { user } = useAuth();
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isBusyRef = useRef(false);

  const refresh = useCallback(async () => {
    const state = await fetchVideoLikeState(videoId, user?.id ?? null);
    setLikeCount(state.count);
    setIsLiked(state.isLiked);
  }, [user?.id, videoId]);

  useEffect(() => {
    let isCurrent = true;
    setLikeCount(null);
    setIsLiked(false);
    setHasError(false);
    setIsLoading(Boolean(videoId));

    if (!videoId) {
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    fetchVideoLikeState(videoId, user?.id ?? null)
      .then((state) => {
        if (!isCurrent) return;
        setLikeCount(state.count);
        setIsLiked(state.isLiked);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        logSupabaseFailure('video-likes', 'fetchLikeState', error);
        setHasError(true);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [user?.id, videoId]);

  const toggleLike = async (): Promise<boolean> => {
    if (!user || isBusyRef.current) return false;
    isBusyRef.current = true;
    setIsBusy(true);
    setHasError(false);
    const nextIsLiked = !isLiked;
    try {
      await setVideoLiked(videoId, user.id, nextIsLiked);
      setIsLiked(nextIsLiked);
      setLikeCount((current) =>
        current === null ? null : Math.max(0, current + (nextIsLiked ? 1 : -1)),
      );
      try {
        await refresh();
      } catch (error) {
        logSupabaseFailure('video-likes', 'refreshLikeState', error);
      }
      return true;
    } catch (error) {
      logSupabaseFailure('video-likes', 'toggleLike', error);
      setHasError(true);
      return false;
    } finally {
      isBusyRef.current = false;
      setIsBusy(false);
    }
  };

  return { likeCount, isLiked, isLoading, isBusy, hasError, toggleLike };
}
