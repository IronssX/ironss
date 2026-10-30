import { requireSupabase } from '@/lib/supabase';
import { translate, type Language } from '@/i18n';

const UNIQUE_VIOLATION_CODE = '23505';
const PERMISSION_DENIED_CODE = '42501';
const CHECK_VIOLATION_CODE = '23514';

export const MAX_CHANNEL_DESCRIPTION_LENGTH = 500;

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
