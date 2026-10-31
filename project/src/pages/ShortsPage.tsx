import {
  ArrowDown,
  ArrowUp,
  Check,
  Clapperboard,
  Heart,
  MessageCircle,
  Pause,
  Play,
  Share2,
  UserRoundPlus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { ShortVideoCommentsSection } from '@/components/ShortVideoCommentsSection';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useChannel } from '@/hooks/useChannel';
import { useLanguage } from '@/hooks/useLanguage';
import { useShortVideoComments } from '@/hooks/useShortVideoComments';
import { useShortVideoLikes } from '@/hooks/useShortVideoLikes';
import type { Page } from '@/types/navigation';
import type { Video } from '@/types/video';
import { formatExactCount } from '@/utils/format';
import { useSettings } from '@/hooks/useSettings';

interface ShortsPageProps {
  videos: Video[];
  schemaMissing: boolean;
  onNavigate: (page: Page) => void;
  onOpenChannel: (channelId: string) => void;
}

export function ShortsPage({ videos, schemaMissing, onNavigate, onOpenChannel }: ShortsPageProps) {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { shortsStartMuted } = useSettings();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(shortsStartMuted);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [playbackError, setPlaybackError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastNavigationRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);
  const activeVideo = videos[activeIndex];
  const {
    likeCount,
    isLiked,
    isLoading: isLikeLoading,
    isBusy: isLikeBusy,
    hasError: likeError,
    toggleLike,
  } = useShortVideoLikes(activeVideo?.id ?? '');
  const shortComments = useShortVideoComments(activeVideo?.id ?? '');
  const {
    channel,
    avatarUrl,
    isLoading: isChannelLoading,
    error: channelError,
    isSubscriptionBusy,
    subscriptionError,
    toggleSubscription,
  } = useChannel(activeVideo?.ownerId ?? '');
  const isOwnChannel = Boolean(user && activeVideo?.ownerId === user.id);
  const navigateVideo = useCallback((direction: 1 | -1) => {
    const now = Date.now();
    if (now - lastNavigationRef.current < 450) return;
    lastNavigationRef.current = now;
    setActiveIndex((index) => Math.max(0, Math.min(videos.length - 1, index + direction)));
    setIsPlaying(true);
    setShowComments(false);
    setShareMessage('');
  }, [videos.length]);

  useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    player.muted = isMuted;
    if (isPlaying) {
      player.play().then(() => setPlaybackError(false)).catch(() => {
        setIsPlaying(false);
        setPlaybackError(true);
      });
    } else {
      player.pause();
    }
  }, [activeIndex, isMuted, isPlaying]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18) return;
      if (event.target instanceof HTMLElement && event.target.closest('[data-shorts-comments]')) return;
      event.preventDefault();
      navigateVideo(event.deltaY > 0 ? 1 : -1);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        navigateVideo(1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        navigateVideo(-1);
      } else if (event.key === ' ') {
        event.preventDefault();
        setIsPlaying((playing) => !playing);
      } else if (event.key.toLowerCase() === 'm') {
        setIsMuted((muted) => !muted);
      } else if (event.key === 'Escape') {
        onNavigate('home');
      }
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigateVideo, onNavigate]);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartRef.current = event.changedTouches[0]?.clientY ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    const end = event.changedTouches[0]?.clientY;
    touchStartRef.current = null;
    if (start === null || end === undefined || Math.abs(start - end) < 48) return;
    navigateVideo(start > end ? 1 : -1);
  };

  const handleShare = async () => {
    if (!activeVideo) return;
    const shareData = { title: activeVideo.title, text: activeVideo.description, url: activeVideo.videoUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage(t('shorts.shared'));
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareData.title}\n${shareData.url}`);
        setShareMessage(t('shorts.linkCopied'));
      } else {
        setShareMessage(t('shorts.shareUnavailable'));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareMessage(t('shorts.shareUnavailable'));
    }
  };

  if (!activeVideo) {
    return (
      <div className="shorts-empty fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center">
        <button type="button" onClick={() => onNavigate('home')} aria-label={t('shorts.close')} className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
          <X className="h-5 w-5" />
        </button>
        <Clapperboard className="h-10 w-10 text-neon-200" />
        <h1 className="mt-5 text-2xl font-semibold text-white">
          {t(schemaMissing ? 'shorts.migrationTitle' : 'shorts.emptyTitle')}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-6 text-gray-400">
          {t(schemaMissing ? 'shorts.migrationRequired' : 'shorts.emptyDescription')}
        </p>
        {!schemaMissing && (
          <button type="button" onClick={() => onNavigate(user ? 'shorts-upload' : 'login')} className="primary-button mt-6 h-11 px-5">
            {t('shorts.create')}
          </button>
        )}
      </div>
    );
  }

  return (
    <main
      className="shorts-stage fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-[#09080d] px-3 py-3 sm:px-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="shorts-ambient pointer-events-none absolute inset-0" />
      <div className="absolute left-5 top-5 z-20 hidden items-center gap-2 text-[11px] font-bold tracking-[.18em] text-white/50 sm:flex">
        <Clapperboard className="h-4 w-4 text-neon-200" />
        IRONSS / SHORTS
      </div>
      <button type="button" onClick={() => onNavigate('home')} aria-label={t('shorts.close')} className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white sm:right-6 sm:top-5">
        <X className="h-5 w-5" />
      </button>

      <div className="relative flex h-full max-h-[min(92dvh,900px)] w-full max-w-[500px] items-center justify-center gap-3 sm:gap-4">
        <div className="shorts-player-shell relative h-full max-h-[min(92dvh,900px)] w-auto aspect-[9/16] max-w-[calc(100vw-32px)] overflow-hidden rounded-[26px] border border-white/10 bg-[#15121a] shadow-[0_30px_120px_-30px_rgba(114,58,150,.48)] sm:rounded-[30px]">
          <video
            ref={videoRef}
            key={activeVideo.id}
            src={activeVideo.videoUrl}
            autoPlay
            playsInline
            muted={isMuted}
            loop
            preload="metadata"
            aria-label={t('shorts.videoLabel', { title: activeVideo.title })}
            className="absolute inset-0 h-full w-full object-contain"
            onClick={() => setIsPlaying((playing) => !playing)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => {
              setPlaybackError(true);
              setIsPlaying(false);
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-semibold text-white/80 backdrop-blur-md sm:hidden">
            <Clapperboard className="h-3.5 w-3.5 text-neon-200" />
            SHORTS
          </div>

          <div className="absolute bottom-5 left-4 right-[4.5rem] z-10 sm:bottom-7 sm:left-5 sm:right-[4.8rem]">
            <button type="button" onClick={() => activeVideo.ownerId && onOpenChannel(activeVideo.ownerId)} className="flex items-center gap-2.5 text-left">
              <UserAvatar name={channel?.profile.username ?? activeVideo.creator} imageUrl={avatarUrl} className="h-10 w-10 border border-white/15 text-sm shadow-lg" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-white">{channel?.profile.username ?? activeVideo.creator}</span>
                <span className="block text-[10px] text-white/55">{formatExactCount(channel?.subscriberCount ?? 0, language)} {t('shorts.followers')}</span>
              </span>
            </button>
            <h1 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-white sm:text-base">{activeVideo.title}</h1>
            {activeVideo.description && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/75">{activeVideo.description}</p>}
          </div>

          {playbackError && (
            <div role="alert" className="absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 rounded-2xl border border-white/10 bg-black/75 p-4 text-center text-sm text-white backdrop-blur-md">
              {t('shorts.playbackError')}
              <button type="button" onClick={() => { setPlaybackError(false); setIsPlaying(true); }} className="mt-3 block w-full text-xs font-semibold text-neon-200">{t('shorts.retry')}</button>
            </div>
          )}

          <button type="button" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? t('shorts.pause') : t('shorts.play')} className={`absolute inset-0 z-[1] m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-opacity ${isPlaying ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
            {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
          </button>

          <div className="absolute bottom-5 right-3 z-10 flex flex-col items-center gap-4 sm:bottom-7 sm:right-4">
            <button type="button" onClick={() => setIsMuted((muted) => !muted)} aria-label={isMuted ? t('shorts.unmute') : t('shorts.mute')} className="shorts-control-button mb-1">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => user ? void toggleLike() : onNavigate('login')}
              disabled={isLikeLoading || isLikeBusy}
              aria-pressed={isLiked}
              aria-label={t(isLiked ? 'like.liked' : 'like.like')}
              className="shorts-control-button disabled:opacity-50"
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-neon-200 text-neon-200' : ''}`} />
              <span>{formatExactCount(likeCount, language)}</span>
            </button>
            <button type="button" onClick={() => setShowComments((shown) => !shown)} aria-expanded={showComments} aria-label={t('shorts.comments')} className="shorts-control-button">
              <MessageCircle className="h-6 w-6" />
              <span>{formatExactCount(shortComments.commentCount, language)}</span>
            </button>
            <button type="button" onClick={() => void handleShare()} aria-label={t('shorts.share')} className="shorts-control-button">
              <Share2 className="h-5 w-5" />
              <span>{t('shorts.share')}</span>
            </button>
            <button
              type="button"
              onClick={() => user ? void toggleSubscription() : onNavigate('login')}
              disabled={isSubscriptionBusy || isOwnChannel || isChannelLoading || !channel}
              aria-label={channel?.isSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
              aria-pressed={channel?.isSubscribed ?? false}
              className={`shorts-control-button mt-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-neon-500 text-white shadow-[0_8px_24px_-10px_rgba(176,108,227,.9)] disabled:opacity-50`}
            >
              {channel?.isSubscribed ? <Check className="h-5 w-5" /> : <UserRoundPlus className="h-5 w-5" />}
            </button>
            {channelError && <p role="alert" className="absolute bottom-0 right-14 w-48 rounded-lg bg-black/80 p-2 text-right text-[10px] text-red-200">{channelError}</p>}
            {subscriptionError && <p role="alert" className="absolute bottom-0 right-14 w-48 rounded-lg bg-black/80 p-2 text-right text-[10px] text-red-200">{subscriptionError}</p>}
            {likeError && <p role="alert" className="absolute bottom-0 right-14 w-48 rounded-lg bg-black/80 p-2 text-right text-[10px] text-red-200">{t('shorts.likeActionFailed')}</p>}
          </div>

          {shareMessage && <p role="status" className="absolute right-3 top-14 z-20 rounded-lg bg-black/70 px-3 py-2 text-[11px] text-white">{shareMessage}</p>}
        </div>

        <div className="hidden flex-col gap-2 sm:flex">
          <button type="button" onClick={() => navigateVideo(-1)} disabled={activeIndex === 0} aria-label={t('shorts.previous')} className="shorts-nav-button">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => navigateVideo(1)} disabled={activeIndex >= videos.length - 1} aria-label={t('shorts.next')} className="shorts-nav-button">
            <ArrowDown className="h-4 w-4" />
          </button>
          <span className="mt-1 text-center text-[10px] tabular-nums text-white/40">{activeIndex + 1} / {videos.length}</span>
        </div>
      </div>

      {showComments && (
        <div data-shorts-comments className="absolute inset-x-3 bottom-3 z-30 max-h-[54dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#15131b]/95 p-4 shadow-2xl backdrop-blur-xl sm:inset-y-16 sm:left-auto sm:right-6 sm:w-[min(380px,calc(100vw-48px))] sm:max-h-[calc(100dvh-8rem)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">{t('shorts.comments')}</h2>
            <button type="button" onClick={() => setShowComments(false)} aria-label={t('shorts.closeComments')} className="icon-button h-8 w-8"><X className="h-4 w-4" /></button>
          </div>
          <ShortVideoCommentsSection
            key={activeVideo.id}
            onNavigate={onNavigate}
            comments={shortComments.comments}
            commentCount={shortComments.commentCount}
            isLoading={shortComments.isLoading}
            isBusy={shortComments.isBusy}
            hasError={shortComments.hasError}
            addComment={shortComments.addComment}
            removeComment={shortComments.removeComment}
          />
        </div>
      )}
    </main>
  );
}
