import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { VideoComment } from '@/types/comment';
import { getVideoComments, saveVideoComments } from '@/utils/commentStorage';
import { addVideoComment as addRemoteVideoComment, fetchVideoComments } from '@/services/videoCommentService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

function createCommentId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useVideoComments(videoId: string) {
  const { user, avatarUrl } = useAuth();
  const [localComments, setLocalComments] = useState<VideoComment[]>(() => getVideoComments(videoId));
  const [remoteComments, setRemoteComments] = useState<VideoComment[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setLocalComments(getVideoComments(videoId));
    setRemoteComments([]);
    setSaveFailed(false);
    setHasError(false);

    fetchVideoComments(videoId)
      .then((fetched) => {
        if (active) setRemoteComments(fetched);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHasError(true);
        logSupabaseFailure('video-comments', 'fetch', error);
      });

    return () => {
      active = false;
    };
  }, [videoId]);

  const addComment = async (body: string, author: string): Promise<boolean> => {
    setSaveFailed(false);
    setHasError(false);
    if (user) {
      try {
        const comment = await addRemoteVideoComment(videoId, user.id, body, author, avatarUrl);
        setRemoteComments((current) => [comment, ...current]);
        return true;
      } catch (error) {
        setSaveFailed(true);
        logSupabaseFailure('video-comments', 'addComment', error);
        return false;
      }
    }

    const nextComments: VideoComment[] = [
      {
        id: createCommentId(),
        author,
        body,
        createdAt: new Date().toISOString(),
      },
      ...localComments,
    ];

    const saved = saveVideoComments(videoId, nextComments);
    setSaveFailed(!saved);
    setLocalComments(nextComments);
    return saved;
  };

  const comments = useMemo(
    () => [...remoteComments, ...localComments].sort((first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
    ),
    [remoteComments, localComments],
  );

  return { comments, addComment, saveFailed, hasError, isSignedIn: Boolean(user) };
}
