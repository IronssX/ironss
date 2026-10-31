import { requireSupabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/services/profileService';

const MAX_SHORT_COMMENT_LENGTH = 500;

export interface ShortVideoComment {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  body: string;
  createdAt: string;
}

interface ShortCommentRow {
  id: string;
  video_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

interface ShortCommentProfile {
  id: string;
  username: string;
  avatar_path: string | null;
}

function isShortCommentRow(value: unknown): value is ShortCommentRow {
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

function isShortCommentProfile(value: unknown): value is ShortCommentProfile {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.id === 'string' &&
    typeof profile.username === 'string' &&
    (profile.avatar_path === null || typeof profile.avatar_path === 'string')
  );
}

export async function fetchShortVideoLikeState(
  videoId: string,
  userId: string | null,
): Promise<{ count: number; isLiked: boolean }> {
  const client = requireSupabase();
  const [countResult, likedResult] = await Promise.all([
    client.rpc('get_short_video_like_counts', { target_video_id: videoId }),
    userId
      ? client
          .from('short_video_likes')
          .select('video_id')
          .eq('video_id', videoId)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (countResult.error) throw countResult.error;
  if (likedResult.error) throw likedResult.error;
  const countRows: unknown = countResult.data;
  if (!Array.isArray(countRows) || countRows.length > 1) {
    throw new Error('Unexpected Shorts like count data.');
  }
  const countRow = countRows[0] as Record<string, unknown> | undefined;
  if (countRow && (countRow.video_id !== videoId ||
    (typeof countRow.like_count !== 'number' && typeof countRow.like_count !== 'string'))) {
    throw new Error('Unexpected Shorts like count.');
  }
  const count = countRow ? Number(countRow.like_count) : 0;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Unexpected Shorts like count.');

  return { count, isLiked: Boolean(likedResult.data) };
}

export async function setShortVideoLiked(
  videoId: string,
  userId: string,
  isLiked: boolean,
): Promise<void> {
  const client = requireSupabase();
  if (isLiked) {
    const { error } = await client
      .from('short_video_likes')
      .insert({ video_id: videoId, user_id: userId });
    if (error && error.code !== '23505') throw error;
    return;
  }

  const { error } = await client
    .from('short_video_likes')
    .delete()
    .eq('video_id', videoId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchShortVideoComments(
  videoId: string,
): Promise<{ comments: ShortVideoComment[]; totalCount: number }> {
  const { data, error, count } = await requireSupabase()
    .from('short_video_comments')
    .select('id, video_id, user_id, body, created_at', { count: 'exact' })
    .eq('video_id', videoId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isShortCommentRow)) {
    throw new Error('Unexpected Shorts comment data.');
  }
  if (data.length === 0) return { comments: [], totalCount: count ?? 0 };

  const userIds = [...new Set(data.map((comment) => comment.user_id))];
  const { data: profiles, error: profileError } = await requireSupabase()
    .from('profiles')
    .select('id, username, avatar_path')
    .in('id', userIds);
  if (profileError) throw profileError;
  if (!Array.isArray(profiles) || !profiles.every(isShortCommentProfile)) {
    throw new Error('Unexpected Shorts commenter profile data.');
  }

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const comments = data.map((comment) => {
    const profile = profileById.get(comment.user_id);
    if (!profile) throw new Error('A Shorts commenter profile could not be found.');
    return {
      id: comment.id,
      videoId: comment.video_id,
      userId: comment.user_id,
      username: profile.username,
      avatarUrl: profile.avatar_path ? getAvatarUrl(profile.avatar_path) : null,
      body: comment.body,
      createdAt: comment.created_at,
    };
  });
  return { comments, totalCount: count ?? comments.length };
}

export async function addShortVideoComment(
  videoId: string,
  userId: string,
  body: string,
): Promise<void> {
  const trimmedBody = body.trim();
  if (!trimmedBody || trimmedBody.length > MAX_SHORT_COMMENT_LENGTH) {
    throw new Error('Invalid Shorts comment length.');
  }

  const { error } = await requireSupabase()
    .from('short_video_comments')
    .insert({ video_id: videoId, user_id: userId, body: trimmedBody });
  if (error) throw error;
}

export async function deleteShortVideoComment(commentId: string, userId: string): Promise<void> {
  const { data, error } = await requireSupabase()
    .from('short_video_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Shorts comment was not deleted.');
}
