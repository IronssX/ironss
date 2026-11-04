import { VIDEO_TYPE_EXTENSIONS } from '@/config/videoUploads';
import { requireSupabase, supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase';
import type { Video, VideoMimeType, VideoType, VideoVisibility } from '@/types/video';

const VIDEO_BUCKET = 'videos';
const privateObjectUrls = new Map<string, string>();
let privateVideoCacheUserId: string | null = null;
let privateVideoCacheGeneration = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', clearPrivateVideoCache);
}

supabase?.auth.onAuthStateChange((event, session) => {
  const nextUserId = session?.user.id ?? null;
  if (event === 'SIGNED_OUT' || nextUserId !== privateVideoCacheUserId) {
    clearPrivateVideoCache();
  }
  privateVideoCacheUserId = nextUserId;
});

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
  mime_type: VideoMimeType;
  thumbnail_path: string | null;
  created_at: string;
  view_count: number;
  video_type?: VideoType;
  visibility: VideoVisibility;
  comments_enabled: boolean;
  privacy_transition_pending: boolean;
}

const VIDEO_FIELDS = 'id, owner_id, uploader_name, title, description, video_path, thumbnail_path, mime_type, created_at, view_count, visibility, comments_enabled, privacy_transition_pending';
const VIDEO_EDIT_FIELDS = 'id, owner_id, uploader_name, title, description, video_path, thumbnail_path, mime_type, created_at, view_count, video_type, visibility, comments_enabled, privacy_transition_pending';

export class VideoTypeSchemaMissingError extends Error {
  constructor() {
    super('The videos.video_type column is missing. Apply the video type migration to enable Shorts.');
    this.name = 'VideoTypeSchemaMissingError';
  }
}

export class VideoPrivacySchemaMissingError extends Error {
  constructor() {
    super('Apply the video visibility and fail-closed transition migrations before using video privacy controls.');
    this.name = 'VideoPrivacySchemaMissingError';
  }
}

export class VideoFileCleanupError extends Error {
  constructor() {
    super('The video record was deleted, but CDN invalidation or file removal is still pending.');
    this.name = 'VideoFileCleanupError';
  }
}

export class VideoCleanupAggregateError extends Error {
  constructor(message: string, readonly operationError: unknown, readonly cleanupError: unknown) {
    super(message);
    this.name = 'VideoCleanupAggregateError';
  }
}

export class VideoUpdateCommittedError extends Error {
  constructor(
    readonly updateError: unknown,
    readonly video?: Video,
    readonly cleanupPending = false,
    readonly privacyTransitionPending = false,
  ) {
    super('Video changes were saved, but old media cleanup is still pending.');
    this.name = 'VideoUpdateCommittedError';
  }
}

export class VideoUpdateOutcomeUnknownError extends Error {
  constructor(readonly updateError: unknown, readonly reconciliationError: unknown) {
    super('The video update outcome could not be verified; staged media files were retained.');
    this.name = 'VideoUpdateOutcomeUnknownError';
  }
}

export function clearPrivateVideoCache(): void {
  privateVideoCacheGeneration += 1;
  for (const url of privateObjectUrls.values()) URL.revokeObjectURL(url);
  privateObjectUrls.clear();
}

function isVideoTypeColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === '42703' &&
    typeof candidate.message === 'string' &&
    candidate.message.includes('video_type');
}

function isVideoPrivacyColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === '42703' &&
    typeof candidate.message === 'string' &&
    (candidate.message.includes('visibility') ||
      candidate.message.includes('comments_enabled') ||
      candidate.message.includes('privacy_transition_pending'));
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
    (row.mime_type === 'video/mp4' || row.mime_type === 'video/webm') &&
    (row.thumbnail_path === null || typeof row.thumbnail_path === 'string') &&
    typeof row.created_at === 'string' &&
    typeof row.view_count === 'number' &&
    (row.video_type === undefined || row.video_type === 'standard' || row.video_type === 'short') &&
    (row.visibility === 'public' || row.visibility === 'private') &&
    typeof row.comments_enabled === 'boolean' &&
    typeof row.privacy_transition_pending === 'boolean'
  );
}

function mapVideoRow(row: VideoRow, signedUrls: Map<string, string>): Video {
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
    thumbnailUrl: !row.privacy_transition_pending && row.thumbnail_path ? signedUrls.get(row.thumbnail_path) ?? '' : '',
    videoUrl: row.visibility === 'public' && !row.privacy_transition_pending ? signedUrls.get(row.video_path) ?? '' : '',
    mimeType: row.mime_type,
    videoType: row.video_type ?? 'standard',
    visibility: row.visibility,
    commentsEnabled: row.comments_enabled,
    privacyTransitionPending: row.privacy_transition_pending,
  };
}

async function getPrivateObjectUrl(path: string): Promise<string> {
  const cachedUrl = privateObjectUrls.get(path);
  if (cachedUrl) return cachedUrl;
  const cacheGeneration = privateVideoCacheGeneration;
  const { data, error } = await requireSupabase().storage.from(VIDEO_BUCKET).download(path);
  if (error) throw error;
  if (!data) throw new Error('Storage returned no private video file.');
  const url = URL.createObjectURL(data);
  if (cacheGeneration !== privateVideoCacheGeneration) {
    URL.revokeObjectURL(url);
    throw new Error('The session changed while loading a private video.');
  }
  privateObjectUrls.set(path, url);
  return url;
}

async function mapVideoRows(rows: VideoRow[]): Promise<Video[]> {
  const publicPaths = [...new Set(rows
    .filter((row) => row.visibility === 'public' && !row.privacy_transition_pending)
    .flatMap((row) => [row.video_path, row.thumbnail_path].filter((path): path is string => Boolean(path))))];
  const signedUrls = new Map<string, string>();
  const storage = requireSupabase().storage.from(VIDEO_BUCKET);
  for (let offset = 0; offset < publicPaths.length; offset += 100) {
    const batch = publicPaths.slice(offset, offset + 100);
    const { data, error } = await storage.createSignedUrls(batch, 60 * 60);
    if (error) throw error;
    if (!Array.isArray(data) || data.length !== batch.length) {
      throw new Error('Storage returned an unexpected number of signed video URLs.');
    }
    for (const item of data) {
      if (typeof item.path !== 'string' || typeof item.signedUrl !== 'string') {
        throw new Error('Storage returned an invalid signed video URL.');
      }
      signedUrls.set(item.path, item.signedUrl);
    }
  }

  const privateRows = rows.filter((row) => row.visibility === 'private' && !row.privacy_transition_pending);
  const privateThumbnailPaths = [...new Set(privateRows.map((row) => row.thumbnail_path).filter((path): path is string => Boolean(path)))];
  for (let offset = 0; offset < privateThumbnailPaths.length; offset += 10) {
    await Promise.all(privateThumbnailPaths.slice(offset, offset + 10).map(getPrivateObjectUrl));
  }

  const allUrls = new Map(signedUrls);
  for (const [path, url] of privateObjectUrls) allUrls.set(path, url);
  return rows.map((row) => mapVideoRow(row, allUrls));
}

async function copyObjectWithShortCache(
  sourcePath: string,
  destinationPath: string,
  expectedContentType: string,
): Promise<void> {
  const storage = requireSupabase().storage.from(VIDEO_BUCKET);
  const { data: file, error: downloadError } = await storage.download(sourcePath);
  if (downloadError) throw downloadError;
  if (!file) throw new Error('Storage returned no file to copy.');
  const { error: uploadError } = await storage.upload(destinationPath, file, {
    cacheControl: '60',
    contentType: file.type || expectedContentType,
    upsert: false,
  });
  if (uploadError) throw uploadError;
}

interface StorageCleanupBatch {
  processedItems: number;
  complete: boolean;
}

async function invokeStorageCleanup(body: { action: string; videoId?: string }): Promise<StorageCleanupBatch> {
  const { data, error } = await requireSupabase().functions.invoke('video-storage-operations', {
    body,
  });
  if (error) throw new VideoFileCleanupError();
  if (!data || typeof data.processedItems !== 'number') throw new VideoFileCleanupError();
  if (data.cleanupComplete === true) {
    return { processedItems: data.processedItems, complete: true };
  }
  if (data.morePending === true && data.processedItems > 0) {
    return { processedItems: data.processedItems, complete: false };
  }
  throw new VideoFileCleanupError();
}

async function processVideoStorageCleanup(videoId: string): Promise<void> {
  for (let batch = 0; batch < 10; batch += 1) {
    const result = await invokeStorageCleanup({ action: 'process-video-cleanup', videoId });
    if (result.complete) return;
    if (result.processedItems < 50) throw new VideoFileCleanupError();
  }
  throw new VideoFileCleanupError();
}

export async function retryOwnVideoStorageCleanup(videoId: string): Promise<Video | null> {
  await processVideoStorageCleanup(videoId);
  return fetchVideoById(videoId);
}

export async function retryMyVideoStorageCleanup(): Promise<void> {
  for (let batch = 0; batch < 10; batch += 1) {
    const result = await invokeStorageCleanup({ action: 'process-my-video-cleanup' });
    if (result.complete) {
      notifyVideoDataChanged();
      return;
    }
    if (result.processedItems < 50) throw new VideoFileCleanupError();
  }
  throw new VideoFileCleanupError();
}

export async function getVideoPlaybackUrl(video: Video): Promise<string> {
  if (video.visibility === 'public') {
    if (video.privacyTransitionPending) throw new Error('Video privacy transition is pending.');
    if (!video.videoUrl) throw new Error('The public video URL is unavailable.');
    return video.videoUrl;
  }
  const client = requireSupabase();
  const { data, error } = await client
    .from('videos')
    .select('video_path')
    .eq('id', video.id)
    .eq('owner_id', video.ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!data || typeof data.video_path !== 'string') throw new Error('Video not found or unavailable.');
  const { data: signedUrlData, error: signedUrlError } = await client.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(data.video_path, 5 * 60);
  if (signedUrlError) throw signedUrlError;
  if (!signedUrlData?.signedUrl) throw new Error('Storage did not return a private video URL.');
  return signedUrlData.signedUrl;
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

async function fetchVideosRange(videoType: VideoType, from: number, to: number): Promise<Video[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('videos')
    .select(`${VIDEO_FIELDS}, video_type`)
    .eq('visibility', 'public')
    .eq('privacy_transition_pending', false)
    .eq('video_type', videoType)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    if (isVideoPrivacyColumnMissing(error)) throw new VideoPrivacySchemaMissingError();
    if (!isVideoTypeColumnMissing(error)) throw error;
    if (videoType === 'short') throw new VideoTypeSchemaMissingError();

    const legacy = await client
      .from('videos')
      .select(VIDEO_FIELDS)
      .eq('visibility', 'public')
      .eq('privacy_transition_pending', false)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (legacy.error) {
      if (isVideoPrivacyColumnMissing(legacy.error)) throw new VideoPrivacySchemaMissingError();
      throw legacy.error;
    }
    if (!Array.isArray(legacy.data) || !legacy.data.every(isVideoRow)) throw new Error('Unexpected video data.');
    return mapVideoRows(legacy.data);
  }

  if (!Array.isArray(data) || !data.every(isVideoRow)) throw new Error('Unexpected video data.');

  return mapVideoRows(data);
}

export async function fetchVideos(videoType: VideoType): Promise<Video[]> {
  return fetchVideosRange(videoType, 0, 99);
}

export async function fetchVideosPage(
  videoType: VideoType,
  offset: number,
  pageSize: number,
): Promise<Video[]> {
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new RangeError('Video page offset and size must be positive safe integers.');
  }
  return fetchVideosRange(videoType, offset, offset + pageSize - 1);
}

export async function searchPublicVideos(terms: string[]): Promise<Video[]> {
  const searchTerms = [...new Set(terms
    .map((term) => term.replace(/[^\p{L}\p{N}]/gu, '').toLocaleLowerCase())
    .filter((term) => term.length >= 2))].slice(0, 5);
  if (searchTerms.length === 0) return [];

  const client = requireSupabase();
  const filter = searchTerms
    .flatMap((term) => [
      `title.ilike.%${term}%`,
      `description.ilike.%${term}%`,
      `uploader_name.ilike.%${term}%`,
    ])
    .join(',');
  const current = await client
    .from('videos')
    .select(`${VIDEO_FIELDS}, video_type`)
    .eq('visibility', 'public')
    .eq('privacy_transition_pending', false)
    .or(filter)
    .order('created_at', { ascending: false })
    .limit(40);

  let rows = current.data;
  if (current.error) {
    if (isVideoPrivacyColumnMissing(current.error)) throw new VideoPrivacySchemaMissingError();
    if (!isVideoTypeColumnMissing(current.error)) throw current.error;

    const legacy = await client
      .from('videos')
      .select(VIDEO_FIELDS)
      .eq('visibility', 'public')
      .eq('privacy_transition_pending', false)
      .or(filter)
      .order('created_at', { ascending: false })
      .limit(40);
    if (legacy.error) {
      if (isVideoPrivacyColumnMissing(legacy.error)) throw new VideoPrivacySchemaMissingError();
      throw legacy.error;
    }
    rows = legacy.data.map((row) => ({ ...row, video_type: 'standard' as const }));
  }

  if (!Array.isArray(rows)) throw new Error('Unexpected video search data.');
  if (!rows.every(isVideoRow)) throw new Error('Unexpected video search data.');
  const publicRows = rows.filter((row) => row.visibility === 'public' && !row.privacy_transition_pending);
  return mapVideoRows(publicRows);
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
      if (isVideoPrivacyColumnMissing(error)) throw new VideoPrivacySchemaMissingError();
      if (!isVideoTypeColumnMissing(error)) throw error;
      const legacy = await client
        .from('videos')
        .select(VIDEO_FIELDS)
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (legacy.error) {
        if (isVideoPrivacyColumnMissing(legacy.error)) throw new VideoPrivacySchemaMissingError();
        throw legacy.error;
      }
      if (!Array.isArray(legacy.data) || !legacy.data.every(isVideoRow)) throw new Error('Unexpected video data.');
      videos.push(...legacy.data);
      if (legacy.data.length < pageSize) break;
      continue;
    }

    if (!Array.isArray(data) || !data.every(isVideoRow)) throw new Error('Unexpected video data.');
    videos.push(...data);
    if (data.length < pageSize) break;
  }

  return mapVideoRows(videos);
}

export async function fetchVideoById(videoId: string): Promise<Video | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('videos')
    .select(`${VIDEO_FIELDS}, video_type`)
    .eq('id', videoId)
    .maybeSingle();

  if (error) {
    if (isVideoPrivacyColumnMissing(error)) throw new VideoPrivacySchemaMissingError();
    if (!isVideoTypeColumnMissing(error)) throw error;
    const legacy = await client
      .from('videos')
      .select(VIDEO_FIELDS)
      .eq('id', videoId)
      .maybeSingle();
    if (legacy.error) {
      if (isVideoPrivacyColumnMissing(legacy.error)) throw new VideoPrivacySchemaMissingError();
      throw legacy.error;
    }
    if (!legacy.data) return null;
    if (!isVideoRow(legacy.data)) throw new Error('Unexpected video data.');
    return (await mapVideoRows([legacy.data]))[0];
  }

  if (!data) return null;
  if (!isVideoRow(data)) throw new Error('Unexpected video data.');
  return (await mapVideoRows([data]))[0];
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
  visibility: VideoVisibility;
  commentsEnabled: boolean;
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
    request.setRequestHeader('cache-control', 'max-age=60');

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
  visibility,
  commentsEnabled,
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
      visibility,
      comments_enabled: commentsEnabled,
    });
    if (error) throw error;
  } catch (error) {
    if (uploadedPaths.length > 0) {
      const { error: cleanupError } = await client.storage.from(VIDEO_BUCKET).remove(uploadedPaths);
      if (cleanupError) {
        throw new VideoCleanupAggregateError(
          'Video upload failed and uploaded files could not be cleaned up.',
          error,
          cleanupError,
        );
      }
    }
    throw error;
  }
}

export interface UpdateVideoInput {
  videoId: string;
  userId: string;
  title: string;
  description: string;
  visibility: VideoVisibility;
  commentsEnabled: boolean;
  thumbnailFile: File | null;
}

export interface UpdateVideoResult {
  video: Video;
  oldFilesCleanupFailed: boolean;
  privacyTransitionCompleted: boolean;
}

export async function updateOwnVideo(input: UpdateVideoInput): Promise<UpdateVideoResult> {
  const client = requireSupabase();
  const { data: initialCurrent, error: currentError } = await client
    .from('videos')
    .select('video_path, thumbnail_path, visibility, privacy_transition_pending')
    .eq('id', input.videoId)
    .eq('owner_id', input.userId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!initialCurrent) throw new Error('Video not found or not editable.');
  let current = initialCurrent;
  if (current.privacy_transition_pending) {
    await processVideoStorageCleanup(input.videoId);
    const refreshed = await client
      .from('videos')
      .select('video_path, thumbnail_path, visibility, privacy_transition_pending')
      .eq('id', input.videoId)
      .eq('owner_id', input.userId)
      .maybeSingle();
    if (refreshed.error) throw refreshed.error;
    if (!refreshed.data || refreshed.data.privacy_transition_pending) {
      throw new VideoFileCleanupError();
    }
    current = refreshed.data;
  }

  const storage = client.storage.from(VIDEO_BUCKET);
  const cleanupNewPaths: string[] = [];
  let newVideoPath: string | null = null;
  let newThumbnailPath: string | null = null;
  let updateAttempted = false;
  let updateCommitted = false;
  let privacyTransitionFinalized = false;
  let committedVideo: Video | undefined;
  const isMakingPrivate = current.visibility === 'public' && input.visibility === 'private';
  try {
    if (isMakingPrivate) {
      const folder = `${input.userId}/${Date.now()}-${crypto.randomUUID()}`;
      const videoFileName = current.video_path.split('/').pop();
      if (!videoFileName) throw new Error('The stored video path is invalid.');
      newVideoPath = `${folder}/${videoFileName}`;
      cleanupNewPaths.push(newVideoPath);
      const currentExtension = videoFileName.split('.').pop()?.toLowerCase();
      const contentType = currentExtension === 'webm' ? 'video/webm' : 'video/mp4';
      await copyObjectWithShortCache(current.video_path, newVideoPath, contentType);

      if (current.thumbnail_path && !input.thumbnailFile) {
        const thumbnailFileName = current.thumbnail_path.split('/').pop();
        if (!thumbnailFileName) throw new Error('The stored thumbnail path is invalid.');
        newThumbnailPath = `${folder}/${thumbnailFileName}`;
        cleanupNewPaths.push(newThumbnailPath);
        const thumbnailExtension = thumbnailFileName.split('.').pop()?.toLowerCase();
        const thumbnailContentType = thumbnailExtension === 'png'
          ? 'image/png'
          : thumbnailExtension === 'webp'
            ? 'image/webp'
            : 'image/jpeg';
        await copyObjectWithShortCache(current.thumbnail_path, newThumbnailPath, thumbnailContentType);
      }
    }

    if (input.thumbnailFile) {
      const extension = VIDEO_TYPE_EXTENSIONS[input.thumbnailFile.type];
      if (!extension) throw new Error('Unsupported thumbnail file type.');
      newThumbnailPath = `${input.userId}/${Date.now()}-${crypto.randomUUID()}/thumbnail.${extension}`;
      cleanupNewPaths.push(newThumbnailPath);
      const { data: sessionData } = await client.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not signed in');
      await uploadObject(newThumbnailPath, input.thumbnailFile, accessToken, () => undefined);
    }

    const update: {
      title: string;
      description: string;
      visibility: VideoVisibility;
      comments_enabled: boolean;
      privacy_transition_pending?: boolean;
      video_path?: string;
      thumbnail_path?: string | null;
    } = {
      title: input.title,
      description: input.description,
      visibility: isMakingPrivate ? 'public' : input.visibility,
      comments_enabled: input.commentsEnabled,
    };
    if (isMakingPrivate) update.privacy_transition_pending = true;
    if (newVideoPath) update.video_path = newVideoPath;
    if (newThumbnailPath) update.thumbnail_path = newThumbnailPath;

    updateAttempted = true;
    const { data, error } = await client
      .from('videos')
      .update(update)
      .eq('id', input.videoId)
      .eq('owner_id', input.userId)
      .eq('video_path', current.video_path)
      .eq('visibility', current.visibility)
      .eq('privacy_transition_pending', false)
      .select(VIDEO_EDIT_FIELDS)
      .maybeSingle();

    if (error) throw error;
    if (!data || !isVideoRow(data)) throw new Error('Video not found or not editable.');
    updateCommitted = true;
    committedVideo = mapVideoRow(data, new Map());
    if (isMakingPrivate) committedVideo = (await mapVideoRows([data]))[0];
    const cleanupNeeded = isMakingPrivate || Boolean(newThumbnailPath && current.thumbnail_path);
    if (cleanupNeeded) {
      await processVideoStorageCleanup(input.videoId);
      if (isMakingPrivate) {
        const finalizedVideo = await fetchVideoById(input.videoId);
        if (!finalizedVideo || finalizedVideo.visibility !== 'private' || finalizedVideo.privacyTransitionPending) {
          throw new VideoFileCleanupError();
        }
        privacyTransitionFinalized = true;
        committedVideo = finalizedVideo;
      }
    }
    const video = isMakingPrivate ? committedVideo : (await mapVideoRows([data]))[0];
    if (!video) throw new Error('The saved video could not be loaded.');
    committedVideo = video;
    if (current.visibility === 'private' && input.visibility === 'public') {
      for (const path of [current.video_path, current.thumbnail_path]) {
        if (!path) continue;
        const objectUrl = privateObjectUrls.get(path);
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          privateObjectUrls.delete(path);
        }
      }
    }
    return { video, oldFilesCleanupFailed: false, privacyTransitionCompleted: isMakingPrivate };
  } catch (error) {
    if (updateAttempted && !updateCommitted) {
      const reconciliation = await client
        .from('videos')
        .select(VIDEO_EDIT_FIELDS)
        .eq('id', input.videoId)
        .eq('owner_id', input.userId)
        .maybeSingle();
      if (reconciliation.error) {
        throw new VideoUpdateOutcomeUnknownError(error, reconciliation.error);
      }
      if (
        reconciliation.data &&
        isVideoRow(reconciliation.data) &&
        ((newVideoPath && reconciliation.data.video_path === newVideoPath) ||
          (newThumbnailPath && reconciliation.data.thumbnail_path === newThumbnailPath))
      ) {
        updateCommitted = true;
        committedVideo = mapVideoRow(reconciliation.data, new Map());
        notifyVideoDataChanged({ video: committedVideo, videoId: input.videoId });
        throw new VideoUpdateCommittedError(
          error,
          committedVideo,
          isMakingPrivate || Boolean(newThumbnailPath && current.thumbnail_path),
          isMakingPrivate,
        );
      }
    }

    if (updateCommitted) {
      notifyVideoDataChanged({ video: committedVideo, videoId: input.videoId });
      throw new VideoUpdateCommittedError(
        error,
        committedVideo,
        (isMakingPrivate && !privacyTransitionFinalized) || error instanceof VideoFileCleanupError,
        isMakingPrivate && !privacyTransitionFinalized,
      );
    }
    if (cleanupNewPaths.length > 0) {
      const { error: cleanupError } = await storage.remove(cleanupNewPaths);
      if (cleanupError) {
        throw new VideoCleanupAggregateError(
          'Video update failed and newly created files could not be cleaned up.',
          error,
          cleanupError,
        );
      }
    }
    throw error;
  }
}

export async function deleteOwnVideo(videoId: string, userId: string): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('videos')
    .delete()
    .eq('id', videoId)
    .eq('owner_id', userId)
    .select('video_path, thumbnail_path')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Video not found or not deletable.');

  try {
    await processVideoStorageCleanup(videoId);
  } catch {
    throw new VideoFileCleanupError();
  }
  for (const path of [data.video_path, data.thumbnail_path]) {
    if (!path) continue;
    const objectUrl = privateObjectUrls.get(path);
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      privateObjectUrls.delete(path);
    }
  }
}

export function notifyVideoDataChanged(detail: { video?: Video; videoId?: string; deleted?: boolean } = {}): void {
  window.dispatchEvent(new CustomEvent('ironss:videos-changed', { detail }));
}
