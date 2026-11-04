import { requireSupabase } from '@/lib/supabase';
import type { CoverTheme, Profile } from '@/types/profile';
import { translate, type Language } from '@/i18n';

const AVATAR_BUCKET = 'avatars';
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_EXTENSIONS = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

interface ProfileRow {
  id: string;
  username: string;
  avatar_path: string | null;
  channel_description: string | null;
  cover_image_path: string | null;
  cover_theme: CoverTheme;
}

export interface PublicProfileSearchResult {
  id: string;
  username: string;
  avatarUrl: string | null;
}

function isProfileRow(value: unknown): value is ProfileRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.username === 'string' &&
    (row.avatar_path === null || typeof row.avatar_path === 'string') &&
    (row.channel_description === null || typeof row.channel_description === 'string') &&
    (row.cover_image_path === null || typeof row.cover_image_path === 'string') &&
    (row.cover_theme === 'purple-neon' ||
      row.cover_theme === 'black' ||
      row.cover_theme === 'minimal' ||
      row.cover_theme === 'gaming')
  );
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('id, username, avatar_path, channel_description, cover_image_path, cover_theme')
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
    coverImagePath: data.cover_image_path,
    coverTheme: data.cover_theme,
  };
}

export async function searchPublicProfiles(terms: string[]): Promise<PublicProfileSearchResult[]> {
  const searchTerms = [...new Set(terms
    .map((term) => term
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/ı/g, 'i')
      .replace(/[^a-z0-9_]/g, ''))
    .filter((term) => term.length >= 3))].slice(0, 5);
  if (searchTerms.length === 0) return [];

  const client = requireSupabase();
  const results = await Promise.all(searchTerms.map((term) =>
    client
      .from('profiles')
      .select('id, username, avatar_path')
      .ilike('username', `%${term}%`)
      .limit(10),
  ));

  const profilesById = new Map<string, PublicProfileSearchResult>();
  for (const { data, error } of results) {
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('Unexpected public profile search data.');
    for (const row of data) {
      if (
        !row ||
        typeof row.id !== 'string' ||
        typeof row.username !== 'string' ||
        (row.avatar_path !== null && typeof row.avatar_path !== 'string')
      ) {
        throw new Error('Unexpected public profile search data.');
      }
      profilesById.set(row.id, {
        id: row.id,
        username: row.username,
        avatarUrl: row.avatar_path ? getAvatarUrl(row.avatar_path) : null,
      });
    }
  }

  return [...profilesById.values()].slice(0, 12);
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

export async function uploadProfileCover(userId: string, file: File): Promise<string> {
  const extension = AVATAR_EXTENSIONS.get(file.type);
  if (!extension) throw new Error('Unsupported cover image type.');
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Cover image exceeds the maximum size.');

  const path = `${userId}/covers/${Date.now()}.${extension}`;
  const { error } = await requireSupabase()
    .storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function updateProfileDetails(
  userId: string,
  username: string,
  description: string,
): Promise<void> {
  const trimmedUsername = username.trim();
  const trimmedDescription = description.trim();
  if (!USERNAME_PATTERN.test(trimmedUsername)) throw new Error('INVALID_USERNAME');
  if (trimmedDescription.length > 500) throw new Error('INVALID_PROFILE_DESCRIPTION');

  const client = requireSupabase();
  const { data: isAvailable, error: availabilityError } = await client.rpc(
    'is_profile_username_available',
    { candidate: trimmedUsername },
  );
  if (availabilityError) throw availabilityError;
  if (isAvailable !== true) throw new Error('USERNAME_TAKEN');

  const { error } = await client
    .from('profiles')
    .update({
      username: trimmedUsername,
      channel_description: trimmedDescription || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
}

export async function updateProfileCover(
  userId: string,
  coverTheme: CoverTheme,
  coverImagePath: string | null,
  previousPath: string | null,
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('profiles')
    .update({
      cover_theme: coverTheme,
      cover_image_path: coverImagePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    if (coverImagePath && coverImagePath !== previousPath) {
      const { error: cleanupError } = await client.storage.from(AVATAR_BUCKET).remove([coverImagePath]);
      if (cleanupError) console.warn('[IRONSS] Unused profile cover could not be removed.', cleanupError);
    }
    throw error;
  }

  if (previousPath && previousPath !== coverImagePath) {
    const { error: removeError } = await client.storage.from(AVATAR_BUCKET).remove([previousPath]);
    if (removeError) console.warn('[IRONSS] Previous profile cover could not be removed.', removeError);
  }
}
