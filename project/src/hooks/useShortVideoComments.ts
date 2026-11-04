import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  addShortVideoComment,
  deleteShortVideoComment,
  fetchShortVideoComments,
  type ShortVideoComment,
} from '@/services/shortVideoInteractionService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

export function useShortVideoComments(videoId: string) {
  const { user } = useAuth();
  const requestContextRef = useRef({ videoId, generation: 0 });
  useLayoutEffect(() => {
    if (requestContextRef.current.videoId === videoId) return;
    requestContextRef.current = {
      videoId,
      generation: requestContextRef.current.generation + 1,
    };
  }, [videoId]);
  const [comments, setComments] = useState<ShortVideoComment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async (targetVideoId: string, generation: number) => {
    const result = await fetchShortVideoComments(targetVideoId);
    if (
      requestContextRef.current.videoId !== targetVideoId ||
      requestContextRef.current.generation !== generation
    ) return;
    setComments(result.comments);
    setCommentCount(result.totalCount);
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const requestContext = requestContextRef.current;
    setComments([]);
    setCommentCount(0);
    setIsBusy(false);
    setHasError(false);
    setIsLoading(Boolean(videoId));

    if (!videoId) return () => {
      isCurrent = false;
    };

    fetchShortVideoComments(videoId)
      .then((result) => {
        if (
          !isCurrent ||
          requestContextRef.current.videoId !== videoId ||
          requestContextRef.current.generation !== requestContext.generation
        ) return;
        setComments(result.comments);
        setCommentCount(result.totalCount);
      })
      .catch((error: unknown) => {
        if (
          !isCurrent ||
          requestContextRef.current.videoId !== videoId ||
          requestContextRef.current.generation !== requestContext.generation
        ) return;
        logSupabaseFailure('short-video-comments', 'fetchComments', error);
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
  }, [videoId]);

  const addComment = async (body: string, parentCommentId?: string): Promise<boolean> => {
    if (!user || isBusy) return false;
    const requestContext = requestContextRef.current;
    const targetVideoId = requestContext.videoId;
    const { generation } = requestContext;
    setIsBusy(true);
    setHasError(false);
    try {
      await addShortVideoComment(targetVideoId, user.id, body, parentCommentId);
      await refresh(targetVideoId, generation);
      if (
        requestContextRef.current.videoId !== targetVideoId ||
        requestContextRef.current.generation !== generation
      ) return false;
      return true;
    } catch (error) {
      logSupabaseFailure('short-video-comments', 'addComment', error);
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

  const removeComment = async (commentId: string): Promise<boolean> => {
    if (!user || isBusy) return false;
    const requestContext = requestContextRef.current;
    const targetVideoId = requestContext.videoId;
    const { generation } = requestContext;
    setIsBusy(true);
    setHasError(false);
    try {
      await deleteShortVideoComment(commentId, user.id);
      await refresh(targetVideoId, generation);
      if (
        requestContextRef.current.videoId !== targetVideoId ||
        requestContextRef.current.generation !== generation
      ) return false;
      return true;
    } catch (error) {
      logSupabaseFailure('short-video-comments', 'deleteComment', error);
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

  return { comments, commentCount, isLoading, isBusy, hasError, addComment, removeComment };
}
