import { requireSupabase } from '@/lib/supabase';

function parseCount(value: unknown): number {
  const count = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Unexpected video like count.');
  return count;
}

export async function fetchVideoLikeState(
  videoId: string,
  userId: string | null,
): Promise<{ count: number; isLiked: boolean }> {
  const client = requireSupabase();
  const [countResult, likedResult] = await Promise.all([
    client.rpc('get_video_like_count', { target_video_id: videoId }),
    userId
      ? client
          .from('video_likes')
          .select('video_id')
          .eq('video_id', videoId)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (countResult.error) throw countResult.error;
  if (likedResult.error) throw likedResult.error;
  return {
    count: parseCount(countResult.data),
    isLiked: Boolean(likedResult.data),
  };
}

export async function setVideoLiked(
  videoId: string,
  userId: string,
  isLiked: boolean,
): Promise<void> {
  const client = requireSupabase();
  if (isLiked) {
    const { error } = await client
      .from('video_likes')
      .insert({ video_id: videoId, user_id: userId });
    if (error && error.code !== '23505') throw error;
    return;
  }

  const { error } = await client
    .from('video_likes')
    .delete()
    .eq('video_id', videoId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchOwnVideoLikeIds(userId: string): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('video_likes')
    .select('video_id')
    .eq('user_id', userId);
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(
    (row: unknown) =>
      typeof row === 'object' &&
      row !== null &&
      'video_id' in row &&
      typeof row.video_id === 'string',
  )) {
    throw new Error('Unexpected liked video data.');
  }
  return data.map((row) => row.video_id);
}

export async function fetchOwnVideoLikeCount(): Promise<number> {
  const { data, error } = await requireSupabase().rpc('get_own_video_like_count');
  if (error) throw error;
  return parseCount(data);
}
