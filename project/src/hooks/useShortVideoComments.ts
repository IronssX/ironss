import { useCallback, useEffect, useState } from 'react';
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
  const [comments, setComments] = useState<ShortVideoComment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  const refresh = useCallback(async () => {
    const result = await fetchShortVideoComments(videoId);
    setComments(result.comments);
    setCommentCount(result.totalCount);
  }, [videoId]);

  useEffect(() => {
    let isCurrent = true;
    setComments([]);
    setCommentCount(0);
    setHasError(false);
    setIsLoading(Boolean(videoId));

    if (!videoId) return () => {
      isCurrent = false;
    };

    fetchShortVideoComments(videoId)
      .then((result) => {
        if (!isCurrent) return;
        setComments(result.comments);
        setCommentCount(result.totalCount);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        logSupabaseFailure('short-video-comments', 'fetchComments', error);
        setHasError(true);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [videoId]);

  const addComment = async (body: string): Promise<boolean> => {
    if (!user || isBusy) return false;
    setIsBusy(true);
    setHasError(false);
    try {
      await addShortVideoComment(videoId, user.id, body);
      await refresh();
      return true;
    } catch (error) {
      logSupabaseFailure('short-video-comments', 'addComment', error);
      setHasError(true);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const removeComment = async (commentId: string): Promise<boolean> => {
    if (!user || isBusy) return false;
    setIsBusy(true);
    setHasError(false);
    try {
      await deleteShortVideoComment(commentId, user.id);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setCommentCount((current) => Math.max(0, current - 1));
      return true;
    } catch (error) {
      logSupabaseFailure('short-video-comments', 'deleteComment', error);
      setHasError(true);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  return { comments, commentCount, isLoading, isBusy, hasError, addComment, removeComment };
}
