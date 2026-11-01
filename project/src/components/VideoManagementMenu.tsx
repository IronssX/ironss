import { Ellipsis, LockKeyhole, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { validateThumbnailFile } from '@/utils/videoValidation';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  deleteOwnVideo,
  notifyVideoDataChanged,
  retryOwnVideoStorageCleanup,
  updateOwnVideo,
  VideoFileCleanupError,
  VideoUpdateCommittedError,
  VideoUpdateOutcomeUnknownError,
} from '@/services/videoService';
import type { Video, VideoVisibility } from '@/types/video';

interface VideoManagementMenuProps {
  video: Video;
}

type DialogMode = 'edit' | 'delete' | null;

export function VideoManagementMenu({ video }: VideoManagementMenuProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [visibility, setVisibility] = useState<VideoVisibility>(video.visibility);
  const [commentsEnabled, setCommentsEnabled] = useState(video.commentsEnabled);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [cleanupPending, setCleanupPending] = useState<'update' | 'delete' | null>(null);
  const [privacyCacheWarning, setPrivacyCacheWarning] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    if (video.privacyTransitionPending) setCleanupPending('update');
    else if (cleanupPending === 'update') setCleanupPending(null);
  }, [cleanupPending, video.privacyTransitionPending]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, [isMenuOpen]);

  if (!user || user.id !== video.ownerId) return null;

  const openDialog = (mode: Exclude<DialogMode, null>) => {
    setTitle(video.title);
    setDescription(video.description);
    setVisibility(video.visibility);
    setCommentsEnabled(video.commentsEnabled);
    setThumbnailFile(null);
    setError('');
    setCleanupPending(null);
    setPrivacyCacheWarning(false);
    setDialogMode(mode);
    setIsMenuOpen(false);
  };

  const handleThumbnailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (file) {
      const validationError = validateThumbnailFile(file, language);
      if (validationError) {
        setThumbnailFile(null);
        setError(validationError);
        return;
      }
    }
    setError('');
    setThumbnailFile(file);
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isBusy) return;
    if (title.trim().length === 0 || title.trim().length > 120 || description.length > 2000) {
      setError(t('videoManage.validationFailed'));
      return;
    }
    setIsBusy(true);
    setError('');
    try {
      const result = await updateOwnVideo({
        videoId: video.id,
        userId: user.id,
        title: title.trim(),
        description: description.trim(),
        visibility,
        commentsEnabled,
        thumbnailFile,
      });
      notifyVideoDataChanged({ video: result.video, videoId: video.id });
      setCleanupPending(null);
      setPrivacyCacheWarning(result.privacyTransitionCompleted);
      if (!result.privacyTransitionCompleted) setDialogMode(null);
    } catch (updateError) {
      console.error('[IRONSS] Video update failed.', updateError);
      if (updateError instanceof VideoUpdateCommittedError) {
        notifyVideoDataChanged({ video: updateError.video, videoId: video.id });
        if (updateError.cleanupPending) {
          setCleanupPending('update');
          setError(t(updateError.privacyTransitionPending ? 'videoManage.oldFilesCleanupPending' : 'videoManage.mediaCleanupPending'));
        } else {
          setError(t('videoManage.savedRefreshFailed'));
        }
      } else if (updateError instanceof VideoUpdateOutcomeUnknownError) {
        notifyVideoDataChanged({ videoId: video.id });
        setCleanupPending('update');
        setError(t('videoManage.updateOutcomeUnknown'));
      } else {
        setError(t('videoManage.saveFailed'));
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleDelete = async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError('');
    try {
      await deleteOwnVideo(video.id, user.id);
      notifyVideoDataChanged({ videoId: video.id, deleted: true });
      setDialogMode(null);
    } catch (deleteError) {
      if (deleteError instanceof VideoFileCleanupError) {
        setCleanupPending('delete');
        setError(t('videoManage.deletedStorageWarning'));
      } else {
        console.error('[IRONSS] Video deletion failed.', deleteError);
        setError(t('videoManage.deleteFailed'));
      }
    } finally {
      setIsBusy(false);
    }
  };

  const retryCleanup = async (requestedMode: 'update' | 'delete' = cleanupPending ?? (video.privacyTransitionPending ? 'update' : 'delete')) => {
    if (isBusy) return;
    setIsBusy(true);
    setError('');
    try {
      const updatedVideo = await retryOwnVideoStorageCleanup(video.id);
      if (requestedMode === 'delete' || !updatedVideo) {
        notifyVideoDataChanged({ videoId: video.id, deleted: true });
        setDialogMode(null);
      } else {
        notifyVideoDataChanged({ video: updatedVideo, videoId: video.id });
        const transitionJustCompleted = video.privacyTransitionPending && updatedVideo.visibility === 'private';
        setPrivacyCacheWarning(transitionJustCompleted);
        setCleanupPending(null);
        setIsMenuOpen(false);
        if (dialogMode !== 'edit') setDialogMode(null);
      }
    } catch (retryError) {
      console.error('[IRONSS] Video storage cleanup retry failed.', retryError);
      setError(t('videoManage.cleanupRetryFailed'));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <div ref={menuRef} className="absolute right-2 top-2 z-10">
        {privacyCacheWarning && !dialogMode && <span role="status" className="absolute right-0 top-11 w-64 rounded-lg border border-amber-300/30 bg-[#171421] px-3 py-2 text-xs leading-relaxed text-amber-100 shadow-xl">{t('videoManage.privacyCacheWarning')}</span>}
        {video.privacyTransitionPending && <span className="absolute right-11 top-2 whitespace-nowrap rounded-full border border-amber-300/30 bg-black/80 px-2 py-1 text-[10px] text-amber-100">{t('videoManage.transitionShort')}</span>}
        <button
          type="button"
          aria-label={t('videoManage.actions')}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/75 text-white backdrop-blur transition-colors hover:border-neon-300/50 hover:text-neon-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-300"
        >
          {video.privacyTransitionPending ? <LockKeyhole className="h-5 w-5 text-amber-200" /> : <Ellipsis className="h-5 w-5" />}
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 top-11 flex w-40 flex-col rounded-xl border border-white/10 bg-[#171421] p-1.5 shadow-xl">
            {video.privacyTransitionPending ? (
              <>
                <p className="px-3 py-2 text-xs leading-relaxed text-amber-100">{t('videoManage.privacyTransitionPending')}</p>
                <button type="button" disabled={isBusy} onClick={() => void retryCleanup('update')} className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-amber-100 hover:bg-white/[0.06] disabled:opacity-60">
                  {t(isBusy ? 'videoManage.retryingCleanup' : 'videoManage.retryCleanup')}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => openDialog('edit')} className="flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-gray-200 hover:bg-white/[0.06]">
                <Pencil className="h-4 w-4" /> {t('videoManage.edit')}
              </button>
            )}
            <button type="button" onClick={() => openDialog('delete')} className="flex h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-red-300 hover:bg-red-500/10">
              <Trash2 className="h-4 w-4" /> {t('videoManage.delete')}
            </button>
          </div>
        )}
      </div>

      {dialogMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isBusy) setDialogMode(null);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-manage-title"
            className="my-auto w-full max-w-xl rounded-2xl border border-white/10 bg-[#171421] p-5 shadow-[0_24px_100px_-24px_rgba(0,0,0,.9)] sm:p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="video-manage-title" className="text-xl font-semibold text-white">
                  {dialogMode === 'edit' ? t('videoManage.editTitle') : t('videoManage.confirmDeleteTitle')}
                </h2>
                {dialogMode === 'delete' && <p className="mt-2 text-sm leading-relaxed text-gray-400">{t('videoManage.confirmDeleteDescription')}</p>}
              </div>
              <button type="button" disabled={isBusy} onClick={() => setDialogMode(null)} aria-label={t('videoManage.close')} className="icon-button h-9 w-9 shrink-0 text-gray-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            {dialogMode === 'edit' ? (
              <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5 text-sm text-gray-300">
                  {t('videoManage.titleLabel')}
                  <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required disabled={isBusy} className="h-11 rounded-xl border border-white/10 bg-black/25 px-3 text-white outline-none focus:border-neon-400/60" />
                </label>
                <label className="flex flex-col gap-1.5 text-sm text-gray-300">
                  {t('videoManage.descriptionLabel')}
                  <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} disabled={isBusy} className="resize-y rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-white outline-none focus:border-neon-400/60" />
                </label>
                <label className="flex flex-col gap-2 text-sm text-gray-300">
                  {t('videoManage.thumbnailLabel')}
                  <span className="flex items-center gap-3">
                    {(thumbnailPreview || video.thumbnailUrl) && <img src={thumbnailPreview ?? video.thumbnailUrl} alt="" className="h-14 w-24 rounded-lg object-cover" />}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleThumbnailChange} disabled={isBusy} className="min-w-0 text-xs text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-neon-500/20 file:px-3 file:py-2 file:text-neon-100" />
                  </span>
                </label>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium text-gray-200">{t('videoManage.visibility')}</legend>
                  {(['public', 'private'] as const).map((option) => (
                    <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${visibility === option ? 'border-neon-400/50 bg-neon-400/[0.07]' : 'border-white/[0.08] bg-black/15'}`}>
                      <input type="radio" name={`visibility-${video.id}`} value={option} checked={visibility === option} onChange={() => setVisibility(option)} disabled={isBusy} className="mt-1 accent-fuchsia-400" />
                      <span>
                        <span className="flex items-center gap-2 text-sm font-medium text-white">{option === 'private' && <LockKeyhole className="h-3.5 w-3.5" />}{t(option === 'public' ? 'videoManage.public' : 'videoManage.private')}</span>
                        <span className="mt-0.5 block text-xs text-gray-400">{t(option === 'public' ? 'videoManage.publicDescription' : 'videoManage.privateDescription')}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] p-3 text-sm text-gray-200">
                  <input type="checkbox" checked={commentsEnabled} onChange={(event) => setCommentsEnabled(event.target.checked)} disabled={isBusy} className="h-4 w-4 accent-fuchsia-400" />
                  {t('videoManage.commentsEnabled')}
                </label>
                {error && (
                  <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <p>{error}</p>
                    {cleanupPending && <button type="button" disabled={isBusy} onClick={() => void retryCleanup()} className="mt-2 font-semibold underline underline-offset-2 disabled:opacity-60">{t(isBusy ? 'videoManage.retryingCleanup' : 'videoManage.retryCleanup')}</button>}
                  </div>
                )}
                {privacyCacheWarning && <p role="status" className="rounded-lg border border-amber-300/30 bg-amber-300/[0.07] px-3 py-2 text-sm text-amber-100">{t('videoManage.privacyCacheWarning')}</p>}
                <div className="mt-1 flex justify-end gap-2">
                  <button type="button" disabled={isBusy} onClick={() => setDialogMode(null)} className="ghost-button h-10 px-4">{t('videoManage.cancel')}</button>
                  <button type="submit" disabled={isBusy || !title.trim()} className="primary-button h-10 px-5">{isBusy ? t('videoManage.saving') : t('videoManage.save')}</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                {error && (
                  <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    <p>{error}</p>
                    {cleanupPending && <button type="button" disabled={isBusy} onClick={() => void retryCleanup()} className="mt-2 font-semibold underline underline-offset-2 disabled:opacity-60">{t(isBusy ? 'videoManage.retryingCleanup' : 'videoManage.retryCleanup')}</button>}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" disabled={isBusy} onClick={() => setDialogMode(null)} className="ghost-button h-10 px-4">{t('videoManage.cancel')}</button>
                  {!cleanupPending && <button type="button" disabled={isBusy} onClick={() => void handleDelete()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500/90 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60">
                    <Trash2 className="h-4 w-4" />{isBusy ? t('videoManage.deleting') : t('videoManage.confirmDelete')}
                  </button>}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
