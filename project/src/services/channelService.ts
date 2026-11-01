import { requireSupabase } from '@/lib/supabase';
import { translate, type Language } from '@/i18n';

const UNIQUE_VIOLATION_CODE = '23505';
const PERMISSION_DENIED_CODE = '42501';
const CHECK_VIOLATION_CODE = '23514';

export const MAX_CHANNEL_DESCRIPTION_LENGTH = 500;

export interface SubscribedChannel {
  id: string;
  username: string;
  avatarPath: string | null;
  description: string | null;
}

interface SubscriptionRow {
  channel_id: string;
  created_at: string;
}

interface SubscribedProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
  channel_description: string | null;
}

function isSubscriptionRow(value: unknown): value is SubscriptionRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.channel_id === 'string' && typeof row.created_at === 'string';
}

function isSubscribedProfileRow(value: unknown): value is SubscribedProfileRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.username === 'string' &&
    (row.avatar_path === null || typeof row.avatar_path === 'string') &&
    (row.channel_description === null || typeof row.channel_description === 'string')
  );
}

export async function fetchSubscribedChannels(subscriberId: string): Promise<SubscribedChannel[]> {
  const client = requireSupabase();
  const { data: subscriptionRows, error: subscriptionsError } = await client
    .from('subscriptions')
    .select('channel_id, created_at')
    .eq('subscriber_id', subscriberId)
    .order('created_at', { ascending: false });

  if (subscriptionsError) throw subscriptionsError;
  if (!Array.isArray(subscriptionRows) || !subscriptionRows.every(isSubscriptionRow)) {
    throw new Error('Unexpected subscription data.');
  }
  if (subscriptionRows.length === 0) return [];

  const { data: profileRows, error: profilesError } = await client
    .from('profiles')
    .select('id, username, avatar_path, channel_description')
    .in('id', subscriptionRows.map((row) => row.channel_id));

  if (profilesError) throw profilesError;
  if (!Array.isArray(profileRows) || !profileRows.every(isSubscribedProfileRow)) {
    throw new Error('Unexpected subscribed profile data.');
  }

  const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));
  return subscriptionRows.flatMap(({ channel_id }) => {
    const profile = profilesById.get(channel_id);
    return profile
      ? [{
          id: profile.id,
          username: profile.username,
          avatarPath: profile.avatar_path,
          description: profile.channel_description,
        }]
      : [];
  });
}

export async function fetchSubscriberCount(channelId: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc('get_channel_subscriber_count', {
    target_channel_id: channelId,
  });

  if (error) throw error;
  if (typeof data !== 'number') throw new Error('Unexpected subscriber count.');
  return data;
}

export async function fetchIsSubscribed(subscriberId: string, channelId: string): Promise<boolean> {
  const { data, error } = await requireSupabase()
    .from('subscriptions')
    .select('channel_id')
    .eq('subscriber_id', subscriberId)
    .eq('channel_id', channelId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function subscribeToChannel(channelId: string): Promise<void> {
  const { error } = await requireSupabase().from('subscriptions').insert({ channel_id: channelId });
  if (error && error.code !== UNIQUE_VIOLATION_CODE) throw error;
}

export async function unsubscribeFromChannel(subscriberId: string, channelId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('subscriptions')
    .delete()
    .eq('subscriber_id', subscriberId)
    .eq('channel_id', channelId);

  if (error) throw error;
}

export async function updateChannelDescription(userId: string, description: string): Promise<void> {
  const trimmed = description.trim();
  const { error } = await requireSupabase()
    .from('profiles')
    .update({ channel_description: trimmed === '' ? null : trimmed })
    .eq('id', userId);

  if (error) throw error;
}

export function describeChannelError(error: unknown, language: Language = 'tr'): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === PERMISSION_DENIED_CODE) return translate(language, 'channel.permission');
  if (code === CHECK_VIOLATION_CODE) {
    return translate(language, 'channel.descriptionTooLong', { count: MAX_CHANNEL_DESCRIPTION_LENGTH });
  }
  if (error instanceof TypeError) return translate(language, 'channel.connectionFailed');
  return translate(language, 'channel.actionFailed');
}
