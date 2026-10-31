import { requireSupabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/services/profileService';
import type { VideoComment } from '@/types/comment';

interface VideoCommentRow {
  id: string;
  video_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface CommentProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
}

function isVideoCommentRow(value: unknown): value is VideoCommentRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.video_id === 'string' &&
    typeof row.user_id === 'string' &&
    typeof row.body === 'string' &&
    typeof row.created_at === 'string'
  );
}

function isCommentProfileRow(value: unknown): value is CommentProfileRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.username === 'string' &&
    (row.avatar_path === null || typeof row.avatar_path === 'string')
  );
}

async function mapCommentRows(rows: VideoCommentRow[]): Promise<VideoComment[]> {
  if (rows.length === 0) return [];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, username, avatar_path')
    .in('id', userIds);
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isCommentProfileRow)) {
    throw new Error('Unexpected video comment profile data.');
  }
  const profileById = new Map(data.map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const profile = profileById.get(row.user_id);
    if (!profile) throw new Error('A video commenter profile could not be found.');
    return {
      id: row.id,
      userId: row.user_id,
      author: profile.username,
      avatarUrl: profile.avatar_path ? getAvatarUrl(profile.avatar_path) : null,
      body: row.body,
      createdAt: row.created_at,
    };
  });
}

export async function fetchVideoComments(videoId: string): Promise<VideoComment[]> {
  const { data, error } = await requireSupabase()
    .from('video_comments')
    .select('id, video_id, user_id, body, created_at')
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isVideoCommentRow)) {
    throw new Error('Unexpected video comment data.');
  }
  return mapCommentRows(data);
}

export async function addVideoComment(
  videoId: string,
  userId: string,
  body: string,
  author: string,
  avatarUrl: string | null,
): Promise<VideoComment> {
  const trimmedBody = body.trim();
  if (!trimmedBody || trimmedBody.length > 500) throw new Error('Invalid video comment length.');

  const { data, error } = await requireSupabase()
    .from('video_comments')
    .insert({ video_id: videoId, user_id: userId, body: trimmedBody })
    .select('id, video_id, user_id, body, created_at')
    .single();
  if (error) throw error;
  if (!isVideoCommentRow(data)) throw new Error('Unexpected created video comment data.');
  return {
    id: data.id,
    userId: data.user_id,
    author,
    avatarUrl,
    body: data.body,
    createdAt: data.created_at,
  };
}
