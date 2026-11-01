import { ArrowLeft, Bookmark, Check, Eye, Link2, Mail, ThumbsDown, UserPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { CommentsSection } from '@/components/CommentsSection';
import { LikeButton } from '@/components/LikeButton';
import { Thumbnail } from '@/components/Thumbnail';
import { VideoPlayer } from '@/components/VideoPlayer';
import { getInitials, formatUploadDate, formatViews } from '@/utils/format';
import { recordVideoView } from '@/services/videoService';
import type { Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import { useVideoLike } from '@/hooks/useVideoLike';
import { useVideoLocalPreferences } from '@/hooks/useVideoLocalPreferences';
import { useChannel } from '@/hooks/useChannel';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import type { Page } from '@/types/navigation';

interface WatchPageProps {
  video: Video;
  relatedVideos: Video[];
  onBack: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onViewRecorded: (videoId: string, views: number) => void;
  onNavigate: (page: Page) => void;
}

export function WatchPage({ video, relatedVideos, onBack, onSelectVideo, onOpenChannel, onViewRecorded, onNavigate }: WatchPageProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { reduceMotion } = useSettings();
  const recordedVideoIdRef = useRef<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [connectionAnimated, setConnectionAnimated] = useState(false);
  const handlePlay = () => {
    if (recordedVideoIdRef.current === video.id) return;
    const videoId = video.id;
    recordedVideoIdRef.current = videoId;
    recordVideoView(videoId)
      .then((views) => onViewRecorded(videoId, views))
      .catch((error: unknown) => {
        recordedVideoIdRef.current = null;
        console.warn('[IRONSS] View could not be recorded.', error);
      });
  };
  const channelId = video.ownerId;
  const { channel, error: channelError, isSubscriptionBusy, subscriptionError, toggleSubscription } = useChannel(channelId ?? '');
  const {
    likeCount,
    isLiked,
    isLoading: isLikeLoading,
    isBusy: isLikeBusy,
    hasError: likeError,
    toggleLike,
  } = useVideoLike(video.id);
  const { isDisliked, isSaved, toggleDislike, clearDislike, toggleSaved } = useVideoLocalPreferences(video.id);
  const shareUrl = new URL(window.location.href);
  shareUrl.searchParams.set('video', video.id);
  const openChannel = () => {
    if (channelId) onOpenChannel(channelId);
  };
  const handleLike = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    if (likeError) return;
    if (!isLiked && isDisliked) clearDislike();
    await toggleLike();
  };
  const handleDislike = async () => {
    if (!isDisliked && isLiked && !(await toggleLike())) return;
    const saved = toggleDislike();
    setActionFeedback(saved ? t('watch.preferenceSaved') : t('watch.preferenceSaveFailed'));
  };
  const handleSave = () => {
    const saved = toggleSaved();
    setActionFeedback(saved ? t('watch.preferenceSaved') : t('watch.preferenceSaveFailed'));
  };
  const handleShare = async () => {
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title: video.title, text: video.description, url: shareUrl.toString() });
          setActionFeedback(t('watch.shareOpened'));
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            setActionFeedback(t('watch.shareCancelled'));
            return;
          }
          console.warn('[IRONSS] Native sharing is unavailable; trying to copy the video link.', error);
        }
      }
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(shareUrl.toString());
      setActionFeedback(t('watch.shareSuccess'));
    } catch (error) {
      console.warn('[IRONSS] Video link could not be shared.', error);
      setActionFeedback(t('watch.shareFailed'));
    }
  };
  const handleConnection = async () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    const changed = await toggleSubscription();
    if (changed) {
      setConnectionAnimated(true);
      window.setTimeout(() => setConnectionAnimated(false), reduceMotion ? 0 : 460);
    }
  };
  const reportHref = `mailto:ironss.support@gmail.com?subject=${encodeURIComponent(
    t('watch.reportSubject', { title: video.title }),
  )}&body=${encodeURIComponent(t('watch.reportBody', { title: video.title, id: video.id, url: shareUrl.toString() }))}`;
  const creatorContent = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-500 to-neon-700 text-sm font-bold text-white">
        {getInitials(video.creator)}
      </span>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-bold text-gray-100">{video.creator}</p>
        <p className="text-xs text-gray-500">{t('watch.memberUpload')}</p>
      </div>
    </>
  );
  return (
    <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
      <div className="flex min-w-0 flex-col gap-5">
        <button
          type="button"
          onClick={onBack}
          className="ghost-button h-10 w-fit px-3 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('watch.backHome')}
        </button>

        <VideoPlayer key={video.id} src={video.videoUrl} title={video.title} onPlay={handlePlay} />

        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-full border border-neon-300/15 bg-neon-300/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.17em] text-neon-200">
              {t('watch.uploaded')}
            </span>
            <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[30px]">{video.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
              <Eye className="h-4 w-4" />
              {formatViews(video.views, language)} &middot; {formatUploadDate(video.uploadedAt, Date.now(), language)}
              {video.category && <> &middot; {video.category}</>}
            </p>
          </div>

          <div className="flex flex-col gap-4 border-y border-white/[0.07] py-4 sm:flex-row sm:items-center sm:justify-between">
            {channelId ? (
              <button
                type="button"
                onClick={openChannel}
                aria-label={t('watch.openChannel', { name: video.creator })}
                className="flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors hover:text-neon-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
              >
                {creatorContent}
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-3">{creatorContent}</div>
            )}
            {channel && channel.profile.id !== user?.id && (
              <button
                type="button"
                onClick={handleConnection}
                disabled={isSubscriptionBusy}
                aria-pressed={channel?.isSubscribed ?? false}
                className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300 ${
                  channel?.isSubscribed
                    ? 'border border-neon-300/30 bg-neon-300/10 text-neon-100 hover:border-pink-300/50 hover:bg-pink-500/10 hover:text-pink-200'
                    : 'bg-neon-500 text-white shadow-[0_0_18px_-8px_rgba(176,38,255,.9)] hover:bg-neon-400'
                } ${connectionAnimated && !reduceMotion ? 'animate-connection-pulse' : ''}`}
              >
                {channel?.isSubscribed ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isSubscriptionBusy
                  ? t('profile.saving')
                  : !user
                    ? t('watch.connectSignIn')
                    : channel?.isSubscribed
                      ? t('watch.disconnect')
                      : t('watch.connect')}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-label={t('watch.videoActions')}>
            <LikeButton
              likeCount={likeCount}
              isLiked={isLiked}
              onToggle={() => void handleLike()}
              disabled={isLikeLoading || isLikeBusy || likeError}
            />
            <button
              type="button"
              onClick={handleDislike}
              aria-pressed={isDisliked}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300 ${
                isDisliked ? 'border-neon-300/30 bg-neon-300/10 text-neon-100' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-neon-300/30 hover:text-white'
              }`}
            >
              <ThumbsDown className={`h-4 w-4 transition-transform duration-200 ${isDisliked && !reduceMotion ? 'scale-110' : ''}`} />
              <span>{t('watch.dislike')}</span>
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-neon-300/30 hover:text-white active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300"
            >
              <Link2 className="h-4 w-4" />
              <span>{t('watch.share')}</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              aria-pressed={isSaved}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300 ${
                isSaved ? 'border-neon-300/30 bg-neon-300/10 text-neon-100' : 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-neon-300/30 hover:text-white'
              }`}
            >
              {isSaved ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span>{isSaved ? t('watch.unsave') : t('watch.save')}</span>
            </button>
            <a
              href={reportHref}
              title={t('watch.reportTitle')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-medium text-gray-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-pink-300/30 hover:text-pink-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300"
            >
              <Mail className="h-4 w-4" />
              <span>{t('watch.report')}</span>
            </a>
          </div>
          {likeError && (
            <p role="alert" className="text-sm text-red-300">{t('watch.likeUnavailable')}</p>
          )}
          <p className="text-xs leading-relaxed text-gray-500">{t('watch.localPreferenceNote')}</p>
          {actionFeedback && (
            <p aria-live="polite" className="text-sm text-neon-200">
              {actionFeedback}
            </p>
          )}
          {subscriptionError && (
            <p role="alert" className="text-sm text-red-300">{subscriptionError || t('watch.connectionError')}</p>
          )}
          {channelError && <p role="alert" className="text-sm text-red-300">{channelError}</p>}

          <p className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 text-sm leading-relaxed text-gray-300">
            {video.description}
          </p>

          <CommentsSection key={video.id} videoId={video.id} />
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <h2 className="eyebrow">{t('watch.upNext')}</h2>
        {relatedVideos.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {relatedVideos.map((related) => (
              <li key={related.id}>
                <button
                  type="button"
                  onClick={() => onSelectVideo(related.id)}
                  className="group flex w-full gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
                >
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl border border-white/[0.08]">
                    <Thumbnail
                      src={related.thumbnailUrl}
                      alt={t('watch.thumbnailAlt', { title: related.title })}
                      className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                    />
                      {related.duration && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[11px] font-medium text-white">
                          {related.duration}
                        </span>
                      )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-100 transition-colors group-hover:text-neon-200">
                      {related.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-gray-400">{related.creator}</p>
                    <p className="text-xs text-gray-500">{formatViews(related.views, language)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t('watch.noRelated')}</p>
        )}
      </aside>
    </div>
  );
}
