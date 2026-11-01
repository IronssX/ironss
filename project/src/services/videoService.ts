import { VIDEO_TYPE_EXTENSIONS } from '@/config/videoUploads';
import { requireSupabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase';
import type { Video, VideoType } from '@/types/video';

const VIDEO_BUCKET = 'videos';

export interface DailyVideoViews {
  date: string;
  views: number;
}

interface VideoRow {
  id: string;
  owner_id: string;
  uploader_name: string;
  title: string;
  description: string;
  video_path: string;
  thumbnail_path: string | null;
  created_at: string;
  view_count: number;
  video_type?: VideoType;
}

const VIDEO_FIELDS = 'id, owner_id, uploader_name, title, description, video_path, thumbnail_path, created_at, view_count';

export class VideoTypeSchemaMissingError extends Error {
  constructor() {
    super('The videos.video_type column is missing. Apply the video type migration to enable Shorts.');
    this.name = 'VideoTypeSchemaMissingError';
  }
}

function isVideoTypeColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === '42703' &&
    typeof candidate.message === 'string' &&
    candidate.message.includes('video_type');
}

function isVideoRow(value: unknown): value is VideoRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.owner_id === 'string' &&
    typeof row.uploader_name === 'string' &&
    typeof row.title === 'string' &&
    typeof row.description === 'string' &&
    typeof row.video_path === 'string' &&
    (row.thumbnail_path === null || typeof row.thumbnail_path === 'string') &&
    typeof row.created_at === 'string' &&
    typeof row.view_count === 'number' &&
    (row.video_type === undefined || row.video_type === 'standard' || row.video_type === 'short')
  );
}

function publicUrl(path: string): string {
  return requireSupabase().storage.from(VIDEO_BUCKET).getPublicUrl(path).data.publicUrl;
}

function mapVideoRow(row: VideoRow): Video {
  return {
    id: row.id,
    title: row.title,
    creator: row.uploader_name,
    ownerId: row.owner_id,
    category: null,
    description: row.description,
    views: row.view_count,
    likes: 0,
    uploadedAt: row.created_at,
    duration: '',
    thumbnailUrl: row.thumbnail_path ? publicUrl(row.thumbnail_path) : '',
    videoUrl: publicUrl(row.video_path),
    videoType: row.video_type ?? 'standard',
  };
}

export async function recordVideoView(videoId: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc('record_video_view', { target_video_id: videoId });
  if (error) throw error;
  if (typeof data !== 'number') throw new Error('Unexpected view count.');
  return data;
}

export async function fetchOwnDailyVideoViews(): Promise<DailyVideoViews[]> {
  const { data, error } = await requireSupabase().rpc('get_own_daily_video_views');
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('Unexpected daily video view data.');

  return data.map((row: unknown) => {
    if (
      !row ||
      typeof row !== 'object' ||
      !('view_date' in row) ||
      typeof row.view_date !== 'string' ||
      !('view_count' in row) ||
      (typeof row.view_count !== 'number' && typeof row.view_count !== 'string')
    ) {
      throw new Error('Unexpected daily video view data.');
    }
    const views = Number(row.view_count);
    if (!Number.isSafeInteger(views) || views < 0) throw new Error('Unexpected daily video view data.');
    return { date: row.view_date, views };
  });
}

export async function fetchVideos(videoType: VideoType): Promise<Video[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('videos')
    .select(`${VIDEO_FIELDS}, video_type`)
    .eq('video_type', videoType)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (!isVideoTypeColumnMissing(error)) throw error;
    if (videoType === 'short') throw new VideoTypeSchemaMissingError();

    const legacy = await client
      .from('videos')
      .select(VIDEO_FIELDS)
      .order('created_at', { ascending: false })
      .limit(100);
    if (legacy.error) throw legacy.error;
    if (!Array.isArray(legacy.data) || !legacy.data.every(isVideoRow)) throw new Error('Unexpected video data.');
    return legacy.data.map(mapVideoRow);
  }

  if (!Array.isArray(data) || !data.every(isVideoRow)) throw new Error('Unexpected video data.');

  return data.map(mapVideoRow);
}

export async function fetchVideosByOwner(ownerId: string): Promise<Video[]> {
  const videos: VideoRow[] = [];
  const pageSize = 500;
  const client = requireSupabase();

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await client
      .from('videos')
      .select(`${VIDEO_FIELDS}, video_type`)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      if (!isVideoTypeColumnMissing(error)) throw error;
      const legacy = await client
        .from('videos')
        .select(VIDEO_FIELDS)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (legacy.error) throw legacy.error;
      if (!Array.isArray(legacy.data) || !legacy.data.every(isVideoRow)) throw new Error('Unexpected video data.');
      videos.push(...legacy.data);
      if (legacy.data.length < pageSize) break;
      continue;
    }

    if (!Array.isArray(data) || !data.every(isVideoRow)) throw new Error('Unexpected video data.');
    videos.push(...data);
    if (data.length < pageSize) break;
  }

  return videos.map(mapVideoRow);
}

export async function fetchVideoById(videoId: string): Promise<Video | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('videos')
    .select(`${VIDEO_FIELDS}, video_type`)
    .eq('id', videoId)
    .maybeSingle();

  if (error) {
    if (!isVideoTypeColumnMissing(error)) throw error;
    const legacy = await client
      .from('videos')
      .select(VIDEO_FIELDS)
      .eq('id', videoId)
      .maybeSingle();
    if (legacy.error) throw legacy.error;
    if (!legacy.data) return null;
    if (!isVideoRow(legacy.data)) throw new Error('Unexpected video data.');
    return mapVideoRow(legacy.data);
  }

  if (!data) return null;
  if (!isVideoRow(data)) throw new Error('Unexpected video data.');
  return mapVideoRow(data);
}

export async function fetchOwnVideos(ownerId: string): Promise<Video[]> {
  return fetchVideosByOwner(ownerId);
}

interface UploadVideoInput {
  userId: string;
  videoFile: File;
  thumbnailFile: File | null;
  title: string;
  description: string;
  videoType: VideoType;
  onProgress: (fraction: number) => void;
}

function uploadObject(
  path: string,
  file: File,
  accessToken: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', `${SUPABASE_URL}/storage/v1/object/${VIDEO_BUCKET}/${encodedPath}`);
    request.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    request.setRequestHeader('apikey', SUPABASE_PUBLISHABLE_KEY ?? '');
    request.setRequestHeader('x-upsert', 'false');
    request.setRequestHeader('Content-Type', file.type);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(1);
        resolve();
        return;
      }
      reject(new Error(`Upload failed with status ${request.status}`));
    };
    request.onerror = () => reject(new Error('Network error during upload'));
    request.send(file);
  });
}

export async function uploadVideo({
  userId,
  videoFile,
  thumbnailFile,
  title,
  description,
  videoType,
  onProgress,
}: UploadVideoInput): Promise<void> {
  const client = requireSupabase();
  const { data: sessionData } = await client.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Not signed in');

  const folder = `${userId}/${Date.now()}-${crypto.randomUUID()}`;
  const videoPath = `${folder}/video.${VIDEO_TYPE_EXTENSIONS[videoFile.type]}`;
  const thumbnailPath = thumbnailFile
    ? `${folder}/thumbnail.${VIDEO_TYPE_EXTENSIONS[thumbnailFile.type]}`
    : null;

  const uploadedPaths: string[] = [];
  try {
    await uploadObject(videoPath, videoFile, accessToken, (fraction) => onProgress(fraction * (thumbnailFile ? 0.9 : 1)));
    uploadedPaths.push(videoPath);

    if (thumbnailFile && thumbnailPath) {
      await uploadObject(thumbnailPath, thumbnailFile, accessToken, (fraction) => onProgress(0.9 + fraction * 0.1));
      uploadedPaths.push(thumbnailPath);
    }

    const { error } = await client.from('videos').insert({
      title,
      description,
      video_path: videoPath,
      thumbnail_path: thumbnailPath,
      mime_type: videoFile.type,
      file_size: videoFile.size,
      video_type: videoType,
    });
    if (error) throw error;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await client.storage.from(VIDEO_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}
