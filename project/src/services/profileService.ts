import { requireSupabase } from '@/lib/supabase';
import type { Profile } from '@/types/profile';
import { translate, type Language } from '@/i18n';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

interface ProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
  channel_description: string | null;
}

function isProfileRow(value: unknown): value is ProfileRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.username === 'string' &&
    (row.avatar_path === null || typeof row.avatar_path === 'string') &&
    (row.channel_description === null || typeof row.channel_description === 'string')
  );
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, username, avatar_path, channel_description')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (!isProfileRow(data)) throw new Error('Unexpected profile data.');

  return {
    id: data.id,
    username: data.username,
    avatarPath: data.avatar_path,
    channelDescription: data.channel_description,
  };
}

export function validateAvatarFile(file: File, language: Language = 'tr'): string | null {
  if (!AVATAR_EXTENSIONS.has(file.type)) return translate(language, 'profile.photoTypeError');
  if (file.size > MAX_AVATAR_BYTES) return translate(language, 'profile.photoSizeError');
  return null;
}

export function getAvatarUrl(path: string): string {
  return requireSupabase().storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadAvatar(userId: string, file: File, previousPath: string | null): Promise<string> {
  const client = requireSupabase();
  const extension = AVATAR_EXTENSIONS.get(file.type);
  if (!extension) throw new Error('Unsupported avatar type.');

  const path = `${userId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const { error: updateError } = await client
    .from('profiles')
    .update({ avatar_path: path, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (updateError) {
    await client.storage.from(AVATAR_BUCKET).remove([path]);
    throw updateError;
  }

  if (previousPath) {
    const { error: removeError } = await client.storage.from(AVATAR_BUCKET).remove([previousPath]);
    if (removeError) console.warn('[IRONSS] Previous profile photo could not be removed.', removeError);
  }

  return path;
}
