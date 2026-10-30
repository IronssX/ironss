import { VIDEO_UPLOAD_LIMITS } from '@/config/videoUploads';
import { translate, type Language } from '@/i18n';

export interface VideoFormValues {
  title: string;
  description: string;
  videoFile: File | null;
  thumbnailFile: File | null;
}

export type VideoFormErrors = Partial<Record<keyof VideoFormValues, string>>;

export function formatFileSize(bytes: number, language: Language = 'tr'): string {
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (bytes < 1024 * 1024) return `${number.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
  return `${number.format(bytes / (1024 * 1024))} MB`;
}

function maxVideoLabel(language: Language): string {
  return formatFileSize(VIDEO_UPLOAD_LIMITS.maxVideoBytes, language);
}

export function validateVideoFile(file: File, language: Language = 'tr'): string | null {
  if (!(VIDEO_UPLOAD_LIMITS.videoTypes as readonly string[]).includes(file.type)) {
    return translate(language, 'validation.videoType');
  }
  if (file.size > VIDEO_UPLOAD_LIMITS.maxVideoBytes) {
    return translate(language, 'validation.videoSize', {
      size: maxVideoLabel(language),
      selectedSize: formatFileSize(file.size, language),
    });
  }
  return null;
}

export function validateShortVideoOrientation(file: File, language: Language = 'tr'): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const finish = (error: string | null) => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(error);
    };

    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = video;
      finish(videoWidth > 0 && videoHeight > videoWidth
        ? null
        : translate(language, 'validation.shortOrientation'));
    };
    video.onerror = () => finish(translate(language, 'validation.shortMetadata'));
    video.src = url;
  });
}

export function validateThumbnailFile(file: File, language: Language = 'tr'): string | null {
  if (!(VIDEO_UPLOAD_LIMITS.thumbnailTypes as readonly string[]).includes(file.type)) {
    return translate(language, 'validation.thumbnailType');
  }
  if (file.size > VIDEO_UPLOAD_LIMITS.maxThumbnailBytes) {
    return translate(language, 'validation.thumbnailSize', {
      size: formatFileSize(VIDEO_UPLOAD_LIMITS.maxThumbnailBytes, language),
    });
  }
  return null;
}

export function validateVideoForm(values: VideoFormValues, language: Language = 'tr'): VideoFormErrors {
  const errors: VideoFormErrors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = translate(language, 'validation.titleRequired');
  } else if (title.length > VIDEO_UPLOAD_LIMITS.maxTitleLength) {
    errors.title = translate(language, 'validation.titleMax', { count: VIDEO_UPLOAD_LIMITS.maxTitleLength });
  }

  if (values.description.length > VIDEO_UPLOAD_LIMITS.maxDescriptionLength) {
    errors.description = translate(language, 'validation.descriptionMax', { count: VIDEO_UPLOAD_LIMITS.maxDescriptionLength });
  }

  if (!values.videoFile) {
    errors.videoFile = translate(language, 'validation.videoRequired');
  } else {
    const videoError = validateVideoFile(values.videoFile, language);
    if (videoError) errors.videoFile = videoError;
  }

  if (values.thumbnailFile) {
    const thumbnailError = validateThumbnailFile(values.thumbnailFile, language);
    if (thumbnailError) errors.thumbnailFile = thumbnailError;
  }

  return errors;
}
