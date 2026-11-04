import {
  ArrowRight,
  Clapperboard,
  Compass,
  LoaderCircle,
  RefreshCw,
  SearchX,
  Sparkles,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Thumbnail } from '@/components/Thumbnail';
import { UserAvatar } from '@/components/UserAvatar';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { fetchSubscribedChannels, type SubscribedChannel } from '@/services/channelService';
import { fetchVideosByOwner, fetchVideosPage } from '@/services/videoService';
import type { Page } from '@/types/navigation';
import type { Video } from '@/types/video';

type HomeFeedTab = 'forYou' | 'following' | 'discover';

interface HomeFeedPageProps {
  videos: Video[];
  shorts: Video[];
  shortsSchemaMissing: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectVideo: (videoId: string, video?: Video) => void;
  onOpenChannel: (channelId: string) => void;
  onNavigate: (page: Page, target?: { shortId?: string }) => void;
}

const INITIAL_VIDEO_COUNT = 12;
const VIDEO_PAGE_SIZE = 24;

export function HomeFeedPage({
  videos,
  shorts,
  shortsSchemaMissing,
  isLoading,
  error,
  onRetry,
  onSelectVideo,
  onOpenChannel,
  onNavigate,
}: HomeFeedPageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const userId = user?.id;
  const [activeTab, setActiveTab] = useState<HomeFeedTab>('forYou');
  const [additionalVideos, setAdditionalVideos] = useState<Video[]>([]);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VIDEO_COUNT);
  const [hasMorePages, setHasMorePages] = useState(videos.length >= 100);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);
  const [followedChannels, setFollowedChannels] = useState<SubscribedChannel[]>([]);
  const [followingVideos, setFollowingVideos] = useState<Video[]>([]);
  const [isFollowingLoading, setIsFollowingLoading] = useState(false);
  const [followingFailed, setFollowingFailed] = useState(false);
  const [followingReload, setFollowingReload] = useState(0);
  const loadMoreLock = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const allVideos = useMemo(() => {
    const seenIds = new Set(videos.map((video) => video.id));
    return [
      ...videos,
      ...additionalVideos.filter((video) => {
        if (seenIds.has(video.id)) return false;
        seenIds.add(video.id);
        return true;
      }),
    ];
  }, [additionalVideos, videos]);
  const videoSetKey = videos.map((video) => video.id).join('|');

  useEffect(() => {
    setAdditionalVideos([]);
    setVisibleCount(INITIAL_VIDEO_COUNT);
    setHasMorePages(videos.length >= 100);
    setLoadMoreFailed(false);
  }, [videoSetKey, videos.length]);

  useEffect(() => {
    let cancelled = false;
    setFollowingVideos([]);
    setFollowedChannels([]);
    setFollowingFailed(false);
    if (!userId) {
      setIsFollowingLoading(false);
      return;
    }

    setIsFollowingLoading(true);
    fetchSubscribedChannels(userId)
      .then(async (channels) => {
        if (cancelled) return;
        setFollowedChannels(channels);
        if (channels.length === 0) return;

        const results = await Promise.allSettled(
          channels.map((channel) => fetchVideosByOwner(channel.id)),
        );
        if (cancelled) return;
        const fulfilled = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
        const uniqueVideos = [...new Map(fulfilled.map((video) => [video.id, video])).values()];
        uniqueVideos.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
        setFollowingVideos(uniqueVideos);
        setFollowingFailed(results.some((result) => result.status === 'rejected'));
      })
      .catch(() => {
        if (!cancelled) setFollowingFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsFollowingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [followingReload, userId]);

  const followedIds = useMemo(
    () => new Set(followedChannels.map((channel) => channel.id)),
    [followedChannels],
  );
  const sourceVideos = activeTab === 'following' ? followingVideos : allVideos;
  const standardVideos = useMemo(
    () => sourceVideos.filter((video) => video.videoType === 'standard'),
    [sourceVideos],
  );
  const orderedVideos = useMemo(() => {
    const ordered = [...standardVideos];
    if (activeTab === 'forYou') {
      ordered.sort((a, b) => b.views - a.views || Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
    } else {
      ordered.sort((a, b) => Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt));
    }
    return ordered;
  }, [activeTab, standardVideos]);
  const visibleVideos = orderedVideos.slice(0, visibleCount);

  const creators = useMemo(() => {
    const creatorsById = new Map<string, { id: string; name: string; videoCount: number }>();
    for (const video of [...allVideos, ...shorts]) {
      if (!video.ownerId || followedIds.has(video.ownerId)) continue;
      const creator = creatorsById.get(video.ownerId);
      if (creator) {
        creator.videoCount += 1;
      } else {
        creatorsById.set(video.ownerId, { id: video.ownerId, name: video.creator, videoCount: 1 });
      }
    }
    return [...creatorsById.values()]
      .sort((a, b) => b.videoCount - a.videoCount || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [allVideos, followedIds, shorts]);

  const trendingShorts = useMemo(
    () => [...shorts].sort((a, b) => b.views - a.views || Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt)),
    [shorts],
  );

  useEffect(() => {
    setVisibleCount(INITIAL_VIDEO_COUNT);
  }, [activeTab]);

  const loadMore = useCallback(async () => {
    const canRevealLoadedVideos = visibleCount < orderedVideos.length;
    if (canRevealLoadedVideos) {
      setVisibleCount((count) => Math.min(count + INITIAL_VIDEO_COUNT, orderedVideos.length));
      return;
    }
    if (
      activeTab === 'following' ||
      !hasMorePages ||
      isLoading ||
      loadMoreLock.current
    ) {
      return;
    }

    loadMoreLock.current = true;
    setIsLoadingMore(true);
    setLoadMoreFailed(false);
    try {
      const nextVideos = await fetchVideosPage('standard', allVideos.length, VIDEO_PAGE_SIZE);
      setAdditionalVideos((current) => [...current, ...nextVideos]);
      setHasMorePages(nextVideos.length === VIDEO_PAGE_SIZE);
      setVisibleCount((count) => count + Math.min(nextVideos.length, INITIAL_VIDEO_COUNT));
    } catch (loadError) {
      console.error('[IRONSS] More videos could not be loaded.', loadError);
      setLoadMoreFailed(true);
    } finally {
      loadMoreLock.current = false;
      setIsLoadingMore(false);
    }
  }, [activeTab, allVideos.length, hasMorePages, isLoading, orderedVideos.length, visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || activeTab === 'following' && (isFollowingLoading || followingFailed)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '480px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [activeTab, followingFailed, isFollowingLoading, loadMore]);

  const tabLabels: { id: HomeFeedTab; label: string; icon: typeof Sparkles }[] = [
    { id: 'forYou', label: t('homeFeed.forYou'), icon: Sparkles },
    { id: 'following', label: t('homeFeed.following'), icon: Users },
    { id: 'discover', label: t('homeFeed.discover'), icon: Compass },
  ];
  const currentLoading = isLoading || activeTab === 'following' && isFollowingLoading;
  const currentFailed = activeTab === 'following' ? followingFailed : Boolean(error);
  const showEmptyError = !currentLoading && currentFailed && orderedVideos.length === 0;
  const showEmptyVideos = !currentLoading && !currentFailed && orderedVideos.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-8 pb-12">
      <header className="discovery-hero relative isolate overflow-hidden rounded-[26px] border border-white/[0.08] px-5 py-7 sm:px-8 sm:py-9">
        <div className="discovery-orb pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full" />
        <div className="relative max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-neon-300/15 bg-neon-300/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neon-200">
            <Sparkles className="h-3.5 w-3.5" />
            {t('homeFeed.eyebrow')}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
            {t('homeFeed.title')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">{t('homeFeed.description')}</p>
        </div>
      </header>

      <div role="tablist" aria-label={t('homeFeed.tabs')} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.025] p-1.5">
        {tabLabels.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`home-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls="home-feed-panel"
            onClick={() => setActiveTab(id)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all sm:px-5 sm:text-sm ${
              activeTab === id
                ? 'bg-neon-300 text-[#17111d] shadow-[0_6px_20px_-12px_rgba(214,176,255,.9)]'
                : 'text-gray-400 hover:bg-white/[0.05] hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <section aria-labelledby="trending-clips-heading" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{t('homeFeed.clipsEyebrow')}</p>
            <h2 id="trending-clips-heading" className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {t('homeFeed.clipsTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shorts')}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-neon-200 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            {t('homeFeed.seeClips')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {trendingShorts.length > 0 ? (
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:gap-4 sm:px-6 lg:-mx-9 lg:px-9">
            {trendingShorts.slice(0, 12).map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onNavigate('shorts', { shortId: clip.id })}
                aria-label={t('homeFeed.openClip', { title: clip.title })}
                className="group relative aspect-[9/16] w-[132px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-white/10 bg-[#15121a] text-left shadow-lg transition duration-300 hover:-translate-y-1 hover:border-neon-300/35 hover:shadow-[0_16px_38px_-20px_rgba(176,38,255,.75)] sm:w-[158px]"
              >
                <Thumbnail
                  src={clip.thumbnailUrl}
                  alt={t('video.thumbnailAlt', { title: clip.title })}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/5" />
                <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-md">
                  <Clapperboard className="h-3 w-3 text-neon-200" />
                  {t('homeFeed.clipLabel')}
                </span>
                <span className="absolute inset-x-3 bottom-3">
                  <span className="block line-clamp-2 text-xs font-bold leading-snug text-white">{clip.title}</span>
                  <span className="mt-1 block truncate text-[10px] text-white/65">{clip.creator}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neon-300/[0.08] text-neon-200">
              <Clapperboard className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-200">{t(shortsSchemaMissing ? 'homeFeed.clipsUnavailableTitle' : 'homeFeed.clipsEmptyTitle')}</p>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">{t(shortsSchemaMissing ? 'homeFeed.clipsUnavailableDescription' : 'homeFeed.clipsEmptyDescription')}</p>
            </div>
            {!shortsSchemaMissing && (
              <button
                type="button"
                onClick={() => onNavigate(user ? 'shorts-upload' : 'login')}
                className="secondary-button ml-auto h-9 shrink-0 px-3 text-xs"
              >
                {t('shorts.create')}
              </button>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section id="home-feed-panel" role="tabpanel" aria-labelledby={`home-tab-${activeTab}`} className="min-w-0">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">{t('homeFeed.videosEyebrow')}</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {t(activeTab === 'following' ? 'homeFeed.followingVideos' : activeTab === 'discover' ? 'homeFeed.discoverVideos' : 'homeFeed.recommendedVideos')}
              </h2>
            </div>
            {activeTab === 'following' && user && followedChannels.length > 0 && (
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold text-gray-400">
                {t('homeFeed.followingCount', { count: followedChannels.length })}
              </span>
            )}
          </div>

          {activeTab === 'following' && !user ? (
            <div className="empty-state flex flex-col items-center gap-3 rounded-[24px] border border-white/[0.08] px-5 py-12 text-center">
              <Users className="h-7 w-7 text-neon-200" />
              <h3 className="text-lg font-semibold text-white">{t('homeFeed.signInTitle')}</h3>
              <p className="max-w-md text-sm leading-6 text-gray-400">{t('homeFeed.signInDescription')}</p>
              <button type="button" onClick={() => onNavigate('login')} className="primary-button mt-2 h-10 px-4">
                {t('topbar.signIn')}
              </button>
            </div>
          ) : currentLoading && orderedVideos.length === 0 ? (
            <div role="status" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="aspect-video animate-pulse rounded-[22px] border border-white/[0.06] bg-white/[0.035]" />
              ))}
              <span className="sr-only">{t('homeFeed.loading')}</span>
            </div>
          ) : showEmptyError ? (
            <div role="alert" className="empty-state flex flex-col items-center gap-3 rounded-[24px] border border-red-400/15 px-5 py-12 text-center">
              <SearchX className="h-7 w-7 text-red-200" />
              <h3 className="text-lg font-semibold text-white">{t('homeFeed.loadErrorTitle')}</h3>
              <p className="max-w-md text-sm leading-6 text-gray-400">{activeTab === 'following' ? t('homeFeed.followingError') : error}</p>
              <button
                type="button"
                onClick={activeTab === 'following' ? () => setFollowingReload((count) => count + 1) : onRetry}
                className="secondary-button mt-2 h-10 px-4"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t('homeFeed.retry')}
              </button>
            </div>
          ) : showEmptyVideos ? (
            <div className="empty-state flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-white/10 px-5 py-12 text-center">
              <SearchX className="h-7 w-7 text-neon-200" />
              <h3 className="text-lg font-semibold text-white">
                {activeTab === 'following' ? t(followedChannels.length > 0 ? 'homeFeed.followingEmptyTitle' : 'homeFeed.noFollowingTitle') : t('homeFeed.videosEmptyTitle')}
              </h3>
              <p className="max-w-md text-sm leading-6 text-gray-400">
                {activeTab === 'following'
                  ? t(followedChannels.length > 0 ? 'homeFeed.followingEmptyDescription' : 'homeFeed.noFollowingDescription')
                  : t('homeFeed.videosEmptyDescription')}
              </p>
              {activeTab === 'following' && followedChannels.length === 0 && (
                <button type="button" onClick={() => onNavigate('explore')} className="secondary-button mt-2 h-10 px-4">
                  <Compass className="h-4 w-4" />
                  {t('feed.exploreAction')}
                </button>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'following' && followingFailed && (
                <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-xs text-red-200">
                  {t('homeFeed.followingPartialError')}
                </p>
              )}
              {error && activeTab !== 'following' && orderedVideos.length > 0 && (
                <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-xs text-red-200">{error}</p>
              )}
              <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 2xl:grid-cols-3">
                {visibleVideos.map((video) => (
                  <VideoCard key={video.id} video={video} onSelect={onSelectVideo} onOpenChannel={onOpenChannel} />
                ))}
              </div>
              <div ref={sentinelRef} className="flex min-h-16 items-center justify-center py-4">
                {isLoadingMore ? (
                  <span role="status" className="flex items-center gap-2 text-xs text-gray-400">
                    <LoaderCircle className="h-4 w-4 animate-spin text-neon-200" />
                    {t('homeFeed.loadingMore')}
                  </span>
                ) : loadMoreFailed ? (
                  <button type="button" onClick={() => void loadMore()} className="secondary-button h-10 px-4">
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('homeFeed.loadMoreError')}
                  </button>
                ) : activeTab === 'following' && visibleCount < orderedVideos.length ? (
                  <span className="text-xs text-gray-500">{t('homeFeed.scrollForMore')}</span>
                ) : null}
              </div>
            </>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="eyebrow">{t('homeFeed.creatorsEyebrow')}</p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">{t('homeFeed.creatorsTitle')}</h2>
          </div>
          {creators.length > 0 ? (
            <div className="flex flex-col gap-2">
              {creators.map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => onOpenChannel(creator.id)}
                  className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition-all hover:border-neon-300/20 hover:bg-white/[0.05]"
                >
                  <UserAvatar name={creator.name} imageUrl={null} className="h-10 w-10 shrink-0 text-xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-gray-100 group-hover:text-neon-200">{creator.name}</span>
                    <span className="mt-1 block text-[10px] text-gray-500">{t('homeFeed.creatorVideoCount', { count: creator.videoCount })}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-600 transition-colors group-hover:text-neon-200" />
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-6 text-center">
              <Users className="mx-auto h-5 w-5 text-gray-600" />
              <p className="mt-2 text-xs leading-5 text-gray-500">{t('homeFeed.creatorsEmpty')}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] px-3 py-2.5 text-xs font-semibold text-gray-300 transition-colors hover:border-neon-300/20 hover:bg-white/[0.04] hover:text-white"
          >
            {t('homeFeed.openDiscover')}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </aside>
      </div>
      {!currentLoading && !currentFailed && orderedVideos.length > 0 && visibleVideos.length < orderedVideos.length && (
        <p className="sr-only" aria-live="polite">{t('homeFeed.scrollForMore')}</p>
      )}
    </div>
  );
}
