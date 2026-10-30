import { useState } from 'react';
import type { VideoComment } from '@/types/comment';
import { getVideoComments, saveVideoComments } from '@/utils/commentStorage';

function createCommentId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useVideoComments(videoId: string) {
  const [comments, setComments] = useState<VideoComment[]>(() => getVideoComments(videoId));
  const [saveFailed, setSaveFailed] = useState(false);

  const addComment = (body: string, author: string) => {
    const nextComments: VideoComment[] = [
      {
        id: createCommentId(),
        author,
        body,
        createdAt: new Date().toISOString(),
      },
      ...comments,
    ];

    setSaveFailed(!saveVideoComments(videoId, nextComments));
    setComments(nextComments);
  };

  return { comments, addComment, saveFailed };
}
