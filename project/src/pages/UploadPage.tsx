import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { CheckCircle2, Film, ImagePlus, Upload } from 'lucide-react';
import { AuthCard } from '@/components/AuthCard';
import { FormField } from '@/components/FormField';
import { VIDEO_UPLOAD_LIMITS } from '@/config/videoUploads';
import { useAuth } from '@/hooks/useAuth';
import { uploadVideo } from '@/services/videoService';
import type { Page } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { translate, type Language } from '@/i18n';
import {
  formatFileSize,
  validateVideoForm,
  type VideoFormErrors,
  type VideoFormValues,
} from '@/utils/videoValidation';

interface UploadPageProps {
  onNavigate: (page: Page) => void;
  onUploaded: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'success';

const EMPTY_VALUES: VideoFormValues = { title: '', description: '', videoFile: null, thumbnailFile: null };

export function UploadPage({ onNavigate, onUploaded }: UploadPageProps) {
  const { language, t } = useLanguage();
  const { user, isLoading } = useAuth();
  const [values, setValues] = useState<VideoFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<VideoFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!values.thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const previewUrl = URL.createObjectURL(values.thumbnailFile);
    setThumbnailPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [values.thumbnailFile]);

  if (isLoading) return null;

  if (!user) {
    return (
      <AuthCard title={t('upload.loginTitle')} subtitle={t('upload.loginSubtitle')}>
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="flex h-11 items-center justify-center rounded-lg bg-neon-500 px-4 text-sm font-medium text-white transition-colors hover:bg-neon-400"
        >
          {t('auth.loginTitle')}
        </button>
      </AuthCard>
    );
  }

  if (status === 'success') {
    return (
      <AuthCard title={t('upload.successTitle')} subtitle={t('upload.successSubtitle')}>
        <div className="flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-neon-300" />
        </div>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex h-11 items-center justify-center rounded-lg bg-neon-500 px-4 text-sm font-medium text-white transition-colors hover:bg-neon-400"
        >
          {t('upload.backHome')}
        </button>
      </AuthCard>
    );
  }

  const isUploading = status === 'uploading';

  const handleTextChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (name: 'videoFile' | 'thumbnailFile') => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setValues((current) => ({ ...current, [name]: file }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateVideoForm(values, language);
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length > 0 || !values.videoFile) return;

    setStatus('uploading');
    setProgress(0);
    try {
      await uploadVideo({
        userId: user.id,
        videoFile: values.videoFile,
        thumbnailFile: values.thumbnailFile,
        title: values.title.trim(),
        description: values.description.trim(),
        onProgress: setProgress,
      });
      setStatus('success');
      onUploaded();
    } catch (error) {
      setStatus('idle');
      setFormError(describeUploadError(error, language));
    }
  };

  return (
    <div className="auth-shell mx-auto flex w-full max-w-2xl animate-fade-in flex-col gap-7 rounded-[28px] border border-white/[0.08] p-6 sm:p-9">
      <div>
        <p className="eyebrow">{t('studio.title')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{t('upload.title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          {t('upload.formats', { size: formatFileSize(VIDEO_UPLOAD_LIMITS.maxVideoBytes, language) })}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-200">{t('upload.videoFile')}</span>
          <button
            type="button"
            disabled={isUploading}
            onClick={() => videoInputRef.current?.click()}
            className={`flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              errors.videoFile ? 'border-red-500/70' : 'border-white/10 bg-white/[0.02] hover:border-neon-300/40 hover:bg-neon-300/[0.035]'
            }`}
          >
            <Film className="h-7 w-7 text-neon-200" />
            <span className="text-sm text-gray-200">
              {values.videoFile ? values.videoFile.name : t('upload.chooseVideo')}
            </span>
            {values.videoFile && (
              <span className="text-xs text-gray-500">{formatFileSize(values.videoFile.size, language)}</span>
            )}
          </button>
          <input
            ref={videoInputRef}
            type="file"
            name="videoFile"
            accept="video/mp4,video/webm"
            onChange={handleFileChange('videoFile')}
            className="hidden"
          />
          {errors.videoFile && <p className="text-xs text-red-300">{errors.videoFile}</p>}
        </div>

        <FormField
          id="upload-title"
          name="title"
          label={t('upload.titleLabel')}
          placeholder={t('upload.titlePlaceholder')}
          maxLength={VIDEO_UPLOAD_LIMITS.maxTitleLength}
          value={values.title}
          onChange={handleTextChange}
          error={errors.title}
          disabled={isUploading}
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="upload-description" className="text-sm font-medium text-gray-200">
            {t('upload.description')} <span className="text-gray-500">({t('upload.optional')})</span>
          </label>
          <textarea
            id="upload-description"
            name="description"
            rows={4}
            value={values.description}
            onChange={handleTextChange}
            disabled={isUploading}
            placeholder={t('upload.descriptionPlaceholder')}
            className={`w-full resize-y rounded-xl border bg-surface px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-2 ${
              errors.description ? 'border-red-500/70 focus:ring-red-500/30' : 'border-surface-border focus:border-neon-500 focus:ring-neon-500/30'
            }`}
          />
          {errors.description && <p className="text-xs text-red-300">{errors.description}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-200">
            {t('upload.thumbnail')} <span className="text-gray-500">({t('upload.optional')})</span>
          </span>
          <label
            className={`flex cursor-pointer items-center gap-4 rounded-xl border border-surface-border bg-surface-raised p-3 transition-colors hover:border-neon-500/60 ${
              isUploading ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            <span className="flex aspect-video w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-background">
              {thumbnailPreview ? (
                <img src={thumbnailPreview} alt={t('upload.selectedThumbnail')} className="h-full w-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-neon-300/70" />
              )}
            </span>
            <span className="min-w-0 text-sm text-gray-300">
              <span className="block truncate">{values.thumbnailFile ? values.thumbnailFile.name : t('upload.chooseThumbnail')}</span>
              <span className="text-xs text-gray-500">{t('upload.thumbnailFormats', { size: formatFileSize(VIDEO_UPLOAD_LIMITS.maxThumbnailBytes, language) })}</span>
            </span>
            <input
              type="file"
              name="thumbnailFile"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange('thumbnailFile')}
              className="sr-only"
            />
          </label>
          {errors.thumbnailFile && <p className="text-xs text-red-300">{errors.thumbnailFile}</p>}
        </div>

        {isUploading && (
          <div className="flex flex-col gap-2" role="status" aria-live="polite">
            <div className="flex justify-between text-xs text-gray-400">
              <span>{t('upload.progress')}</span>
              <span>%{Math.round(progress * 100)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neon-600 to-neon-300 transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        )}

        {formError && (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={isUploading}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-neon-500 px-4 text-sm font-medium text-white shadow-[0_0_20px_-6px_rgba(176,38,255,0.9)] transition-all duration-200 hover:bg-neon-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? t('upload.progress') : t('upload.submit')}
        </button>
      </form>
    </div>
  );
}

function describeUploadError(error: unknown, language: Language): string {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('status 413')) return translate(language, 'upload.fileTooLarge');
  if (message.includes('status 4')) return translate(language, 'upload.serverRejected');
  if (message.includes('Network error')) return translate(language, 'upload.networkError');
  if (message.includes('Not signed in')) return translate(language, 'upload.signInRequired');
  return translate(language, 'upload.failed');
}
