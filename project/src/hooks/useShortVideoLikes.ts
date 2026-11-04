import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchShortVideoLikeState, setShortVideoLiked } from '@/services/shortVideoInteractionService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

export function useShortVideoLikes(videoId: string) {
  const { user } = useAuth();
  const requestContextRef = useRef({ videoId, generation: 0 });
  useLayoutEffect(() => {
    if (requestContextRef.current.videoId === videoId) return;
    requestContextRef.current = {
      videoId,
      generation: requestContextRef.current.generation + 1,
    };
  }, [videoId]);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async (targetVideoId: string, generation: number) => {
    const state = await fetchShortVideoLikeState(targetVideoId, user?.id ?? null);
    if (
      requestContextRef.current.videoId !== targetVideoId ||
      requestContextRef.current.generation !== generation
    ) return;
    setLikeCount(state.count);
    setIsLiked(state.isLiked);
  }, [user?.id]);

  useEffect(() => {
    let isCurrent = true;
    const requestContext = requestContextRef.current;
    setLikeCount(0);
    setIsLiked(false);
    setIsBusy(false);
    setHasError(false);
    setIsLoading(Boolean(videoId));

    if (!videoId) return () => {
      isCurrent = false;
    };

    fetchShortVideoLikeState(videoId, user?.id ?? null)
      .then((state) => {
        if (
          !isCurrent ||
          requestContextRef.current.videoId !== videoId ||
          requestContextRef.current.generation !== requestContext.generation
        ) return;
        setLikeCount(state.count);
        setIsLiked(state.isLiked);
      })
      .catch((error: unknown) => {
        if (
          !isCurrent ||
          requestContextRef.current.videoId !== videoId ||
          requestContextRef.current.generation !== requestContext.generation
        ) return;
        logSupabaseFailure('short-video-likes', 'fetchLikeState', error);
        setHasError(true);
      })
      .finally(() => {
        if (
          isCurrent &&
          requestContextRef.current.videoId === videoId &&
          requestContextRef.current.generation === requestContext.generation
        ) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [user?.id, videoId]);

  const toggleLike = async () => {
    if (!user || isBusy) return false;
    const requestContext = requestContextRef.current;
    const targetVideoId = requestContext.videoId;
    const { generation } = requestContext;
    setIsBusy(true);
    setHasError(false);
    const nextIsLiked = !isLiked;

    try {
      await setShortVideoLiked(targetVideoId, user.id, nextIsLiked);
      if (
        requestContextRef.current.videoId !== targetVideoId ||
        requestContextRef.current.generation !== generation
      ) return false;
      setIsLiked(nextIsLiked);
      setLikeCount((current) => Math.max(0, current + (nextIsLiked ? 1 : -1)));
      await refresh(targetVideoId, generation);
      return true;
    } catch (error) {
      logSupabaseFailure('short-video-likes', 'toggleLike', error);
      if (
        requestContextRef.current.videoId === targetVideoId &&
        requestContextRef.current.generation === generation
      ) setHasError(true);
      return false;
    } finally {
      if (
        requestContextRef.current.videoId === targetVideoId &&
        requestContextRef.current.generation === generation
      ) setIsBusy(false);
    }
  };

  return { likeCount, isLiked, isLoading, isBusy, hasError, toggleLike };
}
