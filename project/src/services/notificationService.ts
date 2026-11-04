import { requireSupabase } from '@/lib/supabase';
import { getAvatarUrl } from '@/services/profileService';

export type NotificationType = 'channel_connected' | 'new_video' | 'new_comment' | 'new_like' | 'comment_reply';

export const NOTIFICATION_PAGE_SIZE = 50;

export interface ActivityNotification {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorAvatarUrl: string | null;
  type: NotificationType;
  videoId: string | null;
  videoTitle: string | null;
  channelId: string | null;
  createdAt: string;
  readAt: string | null;
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  video_id: string | null;
  channel_id: string | null;
  created_at: string;
  read_at: string | null;
}

interface ActorProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
}

interface VideoTitleRow {
  id: string;
  title: string;
}

function isNotificationRow(value: unknown): value is NotificationRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.recipient_id === 'string' &&
    (row.actor_id === null || typeof row.actor_id === 'string') &&
    (row.type === 'channel_connected' ||
      row.type === 'new_video' ||
      row.type === 'new_comment' ||
      row.type === 'new_like' ||
      row.type === 'comment_reply') &&
    (row.video_id === null || typeof row.video_id === 'string') &&
    (row.channel_id === null || typeof row.channel_id === 'string') &&
    typeof row.created_at === 'string' &&
    (row.read_at === null || typeof row.read_at === 'string')
  );
}

function isActorProfileRow(value: unknown): value is ActorProfileRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.username === 'string' &&
    (row.avatar_path === null || typeof row.avatar_path === 'string')
  );
}

function isVideoTitleRow(value: unknown): value is VideoTitleRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.title === 'string';
}

function hasId(value: unknown): value is { id: string } {
  if (!value || typeof value !== 'object') return false;
  return 'id' in value && typeof value.id === 'string';
}

export async function fetchNotifications(
  recipientId: string,
  notificationId?: string,
  offset = 0,
): Promise<ActivityNotification[]> {
  let query = requireSupabase()
    .from('notifications')
    .select('id, recipient_id, actor_id, type, video_id, channel_id, created_at, read_at')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false });

  if (notificationId) query = query.eq('id', notificationId).limit(1);
  else query = query.range(offset, offset + NOTIFICATION_PAGE_SIZE - 1);

  const { data, error } = await query;
  if (error) throw error;
  if (!Array.isArray(data) || !data.every(isNotificationRow)) {
    throw new Error('Unexpected notification data.');
  }
  if (data.length === 0) return [];

  const actorIds = [...new Set(data.flatMap((row) => row.actor_id ? [row.actor_id] : []))];
  const videoIds = [...new Set(data.flatMap((row) => row.video_id ? [row.video_id] : []))];
  const [profilesResult, videosResult] = await Promise.all([
    actorIds.length > 0
      ? requireSupabase().from('profiles').select('id, username, avatar_path').in('id', actorIds)
      : Promise.resolve({ data: [], error: null }),
    videoIds.length > 0
      ? requireSupabase().from('videos').select('id, title').in('id', videoIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (videosResult.error) throw videosResult.error;
  if (!Array.isArray(profilesResult.data) || !profilesResult.data.every(isActorProfileRow)) {
    throw new Error('Unexpected notification actor data.');
  }
  if (!Array.isArray(videosResult.data) || !videosResult.data.every(isVideoTitleRow)) {
    throw new Error('Unexpected notification video data.');
  }

  const profilesById = new Map(profilesResult.data.map((profile) => [profile.id, profile]));
  const videosById = new Map(videosResult.data.map((video) => [video.id, video]));

  return data.map((row) => {
    const actor = row.actor_id ? profilesById.get(row.actor_id) : undefined;
    return {
      id: row.id,
      actorId: row.actor_id,
      actorName: actor?.username ?? null,
      actorAvatarUrl: actor?.avatar_path ? getAvatarUrl(actor.avatar_path) : null,
      type: row.type,
      videoId: row.video_id,
      videoTitle: row.video_id ? videosById.get(row.video_id)?.title ?? null : null,
      channelId: row.channel_id,
      createdAt: row.created_at,
      readAt: row.read_at,
    };
  });
}

export async function fetchUnreadNotificationCount(recipientId: string): Promise<number> {
  const { count, error } = await requireSupabase()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', recipientId)
    .is('read_at', null);

  if (error) throw error;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) {
    throw new Error('Unexpected unread notification count.');
  }
  return count;
}

export async function markNotificationRead(notificationId: string, recipientId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('recipient_id', recipientId)
    .is('read_at', null);

  if (error) throw error;
}

export async function markAllNotificationsRead(recipientId: string): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', recipientId)
    .is('read_at', null)
    .select('id');

  if (error) throw error;
  if (!Array.isArray(data) || !data.every(hasId)) {
    throw new Error('Unexpected updated notification data.');
  }
  return data.map((row) => row.id);
}
