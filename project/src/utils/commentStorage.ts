import type { VideoComment } from '@/types/comment';

const STORAGE_KEY = 'ironss:comments';

type CommentsByVideo = Record<string, VideoComment[]>;

function isVideoComment(value: unknown): value is VideoComment {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.author === 'string' &&
    typeof candidate.body === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}

function readAllComments(): CommentsByVideo {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as CommentsByVideo)
      : {};
  } catch (error) {
    console.warn('[IRONSS] Saved comments could not be read; starting with none.', error);
    return {};
  }
}

export function getVideoComments(videoId: string): VideoComment[] {
  const stored = readAllComments()[videoId];
  return Array.isArray(stored) ? stored.filter(isVideoComment) : [];
}

export function saveVideoComments(videoId: string, comments: VideoComment[]): boolean {
  const allComments = readAllComments();
  allComments[videoId] = comments;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allComments));
    return true;
  } catch (error) {
    console.warn('[IRONSS] Comment could not be saved to this browser.', error);
    return false;
  }
}
