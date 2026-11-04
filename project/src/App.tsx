import { Library, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { useUploadedVideos } from '@/hooks/useUploadedVideos';
import { ChannelPage } from '@/pages/ChannelPage';
import { FeedPage } from '@/pages/FeedPage';
import { HomeFeedPage } from '@/pages/HomeFeedPage';
import { LoginPage } from '@/pages/LoginPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { UploadPage } from '@/pages/UploadPage';
import { WatchPage } from '@/pages/WatchPage';
import { CreatorStudioPage } from '@/pages/CreatorStudioPage';
import { ShortsPage } from '@/pages/ShortsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UploadChoicePage } from '@/pages/UploadChoicePage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SubscriptionsPage } from '@/pages/SubscriptionsPage';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Page } from '@/types/navigation';
import type { CategoryFilter, Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { clearPrivateVideoCache, fetchVideoById, retryMyVideoStorageCleanup } from '@/services/videoService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

interface RouteLocation {
  page: Page;
  videoId: string | null;
  channelId: string | null;
  shortId: string | null;
}

const routablePages = new Set<string>([
  'home', 'explore', 'shorts', 'subscriptions', 'library', 'notifications',
  'watch', 'login', 'register', 'profile', 'upload-choice', 'upload',
  'shorts-upload', 'channel', 'studio', 'settings',
]);

function getRouteLocation(): RouteLocation {
  const params = new URLSearchParams(window.location.search);
  const videoId = params.get('video');
  const channelId = params.get('channel');
  const shortId = params.get('clip');
  if (videoId) return { page: 'watch', videoId, channelId: null, shortId: null };
  if (channelId) return { page: 'channel', videoId: null, channelId, shortId: null };
  if (shortId) return { page: 'shorts', videoId: null, channelId: null, shortId };
  const requestedPage = params.get('page');
  return {
    page: requestedPage && routablePages.has(requestedPage) ? requestedPage as Page : 'home',
    videoId: null,
    channelId: null,
    shortId: null,
  };
}

function App() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const previousUserId = useRef(user?.id ?? null);
  const notificationState = useNotifications(user?.id ?? null);
  const [initialRoute] = useState(getRouteLocation);
  const [page, setPage] = useState<Page>(initialRoute.page);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(initialRoute.videoId);
  const [selectedVideoOverride, setSelectedVideoOverride] = useState<Video | null>(null);
  const [isSelectedVideoLoading, setIsSelectedVideoLoading] = useState(initialRoute.videoId !== null);
  const [selectedVideoLoadFailed, setSelectedVideoLoadFailed] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialRoute.channelId);
  const [selectedShortId, setSelectedShortId] = useState<string | null>(initialRoute.shortId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [cleanupRetryFailed, setCleanupRetryFailed] = useState(false);
  const [cleanupRetryBusy, setCleanupRetryBusy] = useState(false);

  const {
    videos: uploadedVideos,
    shorts: uploadedShorts,
    isLoading: isVideosLoading,
    shortsSchemaMissing,
    error: uploadsError,
    refresh: refreshUploads,
  } = useUploadedVideos();
  const [viewOverrides, setViewOverrides] = useState<Record<string, number>>({});
  const allVideos = useMemo(
    () =>
      uploadedVideos.map((video) =>
        viewOverrides[video.id] === undefined ? video : { ...video, views: viewOverrides[video.id] },
      ),
    [uploadedVideos, viewOverrides],
  );
  const allShorts = useMemo(
    () =>
      uploadedShorts.map((video) =>
        viewOverrides[video.id] === undefined ? video : { ...video, views: viewOverrides[video.id] },
      ),
    [uploadedShorts, viewOverrides],
  );
  const allUploadedVideos = useMemo(() => [...allVideos, ...allShorts], [allVideos, allShorts]);
  const publicVideos = useMemo(() => allVideos.filter((video) => video.visibility === 'public'), [allVideos]);
  const publicShorts = useMemo(() => allShorts.filter((video) => video.visibility === 'public'), [allShorts]);

  const handleViewRecorded = (videoId: string, views: number) => {
    setViewOverrides((current) => ({ ...current, [videoId]: views }));
  };

  const trendingVideos = useMemo(
    () => [...publicVideos].sort((a, b) => b.views - a.views),
    [publicVideos],
  );

  const selectedVideo = selectedVideoOverride?.id === selectedVideoId
    ? selectedVideoOverride
    : allUploadedVideos.find((video) => video.id === selectedVideoId) ?? null;

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (previousUserId.current === nextUserId) return;
    previousUserId.current = nextUserId;
    clearPrivateVideoCache();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setCleanupRetryFailed(false);
      return;
    }
    let active = true;
    retryMyVideoStorageCleanup().then(() => {
      if (active) setCleanupRetryFailed(false);
    }).catch((error: unknown) => {
      console.error('[IRONSS] Pending video file cleanup could not be completed.', error);
      if (active) setCleanupRetryFailed(true);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const retryPendingVideoCleanup = async () => {
    if (cleanupRetryBusy) return;
    setCleanupRetryBusy(true);
    try {
      await retryMyVideoStorageCleanup();
      setCleanupRetryFailed(false);
    } catch (error) {
      console.error('[IRONSS] Pending video file cleanup retry failed.', error);
      setCleanupRetryFailed(true);
    } finally {
      setCleanupRetryBusy(false);
    }
  };

  useEffect(() => {
    if (page !== 'watch' || !selectedVideoId) {
      setIsSelectedVideoLoading(false);
      setSelectedVideoLoadFailed(false);
      return;
    }
    if (selectedVideo) {
      setIsSelectedVideoLoading(false);
      setSelectedVideoLoadFailed(false);
      return;
    }
    if (isVideosLoading) return;

    let isCurrent = true;
    setIsSelectedVideoLoading(true);
    setSelectedVideoLoadFailed(false);
    fetchVideoById(selectedVideoId)
      .then((video) => {
        if (!isCurrent) return;
        if (video) {
          setSelectedVideoOverride(video);
        } else {
          setSelectedVideoLoadFailed(true);
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        logSupabaseFailure('videos', 'fetchVideoById', error);
        setSelectedVideoLoadFailed(true);
      })
      .finally(() => {
        if (isCurrent) setIsSelectedVideoLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isVideosLoading, page, selectedVideo, selectedVideoId]);

  const scrollToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), []);

  const navigate = useCallback((nextPage: Page, target?: { videoId?: string; channelId?: string; shortId?: string }) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('video');
    nextUrl.searchParams.delete('channel');
    nextUrl.searchParams.delete('clip');
    nextUrl.searchParams.delete('page');
    if (nextPage === 'watch' && target?.videoId) {
      nextUrl.searchParams.set('video', target.videoId);
    } else if (nextPage === 'channel' && target?.channelId) {
      nextUrl.searchParams.set('channel', target.channelId);
    } else if (nextPage === 'shorts' && target?.shortId) {
      nextUrl.searchParams.set('clip', target.shortId);
    } else if (nextPage !== 'home') {
      nextUrl.searchParams.set('page', nextPage);
    }
    if (nextUrl.href !== window.location.href) {
      window.history.pushState({ page: nextPage }, '', nextUrl);
    }
    setPage(nextPage);
    setSelectedShortId(nextPage === 'shorts' ? target?.shortId ?? null : null);
    setIsSidebarOpen(false);
    scrollToTop();
  }, [scrollToTop]);

  useEffect(() => {
    const handleVideoChanged = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail || typeof event.detail !== 'object') return;
      const detail = event.detail as { video?: Video; videoId?: string; deleted?: boolean };
      if (detail.video?.id === selectedVideoId) setSelectedVideoOverride(detail.video);
      if (detail.deleted && detail.videoId === selectedVideoId) {
        setSelectedVideoOverride(null);
        setSelectedVideoId(null);
        navigate('home');
      }
    };
    window.addEventListener('ironss:videos-changed', handleVideoChanged);
    return () => window.removeEventListener('ironss:videos-changed', handleVideoChanged);
  }, [navigate, selectedVideoId]);

  useEffect(() => {
    if (
      page === 'watch' &&
      selectedVideo?.visibility === 'private' &&
      selectedVideo.ownerId !== user?.id
    ) {
      setSelectedVideoOverride(null);
      setSelectedVideoId(null);
      navigate('home');
    }
  }, [navigate, page, selectedVideo, user?.id]);

  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteLocation();
      setPage(route.page);
      setSelectedVideoId(route.videoId);
      setSelectedVideoOverride(null);
      setIsSelectedVideoLoading(route.videoId !== null);
      setSelectedVideoLoadFailed(false);
      setSelectedChannelId(route.channelId);
      setSelectedShortId(route.shortId);
      setIsSidebarOpen(false);
      scrollToTop();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scrollToTop]);

  const openVideo = (videoId: string, video?: Video) => {
    setSelectedVideoId(videoId);
    setSelectedVideoOverride(video ?? null);
    navigate('watch', { videoId });
  };

  const openChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    navigate('channel', { channelId });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (page !== 'explore') {
      navigate('explore');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setCategory('All');
  };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return (
          <HomeFeedPage
            videos={publicVideos}
            shorts={publicShorts}
            shortsSchemaMissing={shortsSchemaMissing}
            isLoading={isVideosLoading}
            error={uploadsError}
            onRetry={refreshUploads}
            onSelectVideo={openVideo}
            onOpenChannel={openChannel}
            onNavigate={navigate}
          />
        );
      case 'explore':
        return (
          <FeedPage
            title={t('feed.exploreTitle')}
            description={t('feed.exploreDescription')}
            videos={trendingVideos}
            query={query}
            category={category}
            onCategoryChange={setCategory}
            onResetFilters={resetFilters}
            onSelectVideo={openVideo}
            onOpenChannel={openChannel}
            onNavigate={navigate}
            isHome={false}
          />
        );
      case 'shorts':
        return (
          <ShortsPage
            videos={publicShorts}
            schemaMissing={shortsSchemaMissing}
            onNavigate={navigate}
            onOpenChannel={openChannel}
            initialVideoId={selectedShortId}
          />
        );
      case 'login':
        return <LoginPage onNavigate={navigate} />;
      case 'register':
        return <RegisterPage onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} onOpenChannel={openChannel} />;
      case 'subscriptions':
        return <SubscriptionsPage onNavigate={navigate} onOpenChannel={openChannel} />;
      case 'library':
        return <LibraryPage videos={allVideos} onSelectVideo={openVideo} onOpenChannel={openChannel} />;
      case 'notifications':
        return (
          <NotificationsPage
            notifications={notificationState.notifications}
            unreadCount={notificationState.unreadCount}
            isLoading={notificationState.isLoading}
            isLoadingMore={notificationState.isLoadingMore}
            hasMore={notificationState.hasMore}
            error={notificationState.error}
            actionError={notificationState.actionError}
            isSignedIn={Boolean(user)}
            onRefresh={() => void notificationState.refresh()}
            onLoadMore={() => void notificationState.loadMore()}
            onMarkRead={notificationState.markRead}
            onMarkAllRead={notificationState.markAllRead}
            onOpenVideo={openVideo}
            onOpenChannel={openChannel}
            onSignIn={() => navigate('login')}
          />
        );
      case 'upload':
        return <UploadPage onNavigate={navigate} onUploaded={refreshUploads} videoType="standard" />;
      case 'upload-choice':
        return <UploadChoicePage onNavigate={navigate} />;
      case 'shorts-upload':
        return (
          <UploadPage
            onNavigate={navigate}
            onUploaded={refreshUploads}
            videoType="short"
            shortsSchemaMissing={shortsSchemaMissing}
          />
        );
      case 'studio':
        return <CreatorStudioPage onNavigate={navigate} onSelectVideo={openVideo} />;
      case 'settings':
        return <SettingsPage onNavigate={navigate} />;
      case 'channel':
        if (!selectedChannelId) {
          return (
            <PlaceholderPage
              icon={Users}
              title={t('placeholder.channelMissingTitle')}
              message={t('placeholder.channelMissingMessage')}
              actionLabel={t('placeholder.backHome')}
              onAction={() => navigate('home')}
            />
          );
        }
        return (
          <ChannelPage
            key={selectedChannelId}
            channelId={selectedChannelId}
            onSelectVideo={openVideo}
            onNavigate={navigate}
          />
        );
      case 'watch':
        if (isSelectedVideoLoading) {
          return <LoadingSpinner label={t('loading.video')} />;
        }
        if (!selectedVideo) {
          return (
            <div className="flex flex-col gap-4">
              {selectedVideoLoadFailed && (
                <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {t('videos.fetchFailed')}
                </p>
              )}
              <PlaceholderPage
                icon={Library}
                title={t('placeholder.videoMissingTitle')}
                message={t('placeholder.videoMissingMessage')}
                actionLabel={t('placeholder.backHome')}
                onAction={() => navigate('home')}
              />
            </div>
          );
        }
        return (
          <WatchPage
            video={selectedVideo}
            relatedVideos={allUploadedVideos.filter((video) =>
              video.id !== selectedVideo.id &&
              (video.visibility === 'public' || video.ownerId === user?.id),
            )}
            onBack={() => navigate('home')}
            onSelectVideo={openVideo}
            onOpenChannel={openChannel}
            onViewRecorded={handleViewRecorded}
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen text-gray-100">
      <TopBar
        query={query}
        onQueryChange={handleQueryChange}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        onGoHome={() => navigate('home')}
        onNavigate={navigate}
        unreadCount={notificationState.unreadCount}
      />

      <div className="flex min-h-screen pt-[76px]">
        <Sidebar
          activePage={page}
          isOpen={isSidebarOpen}
          onNavigate={navigate}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 md:ml-[248px] lg:px-9">
          {cleanupRetryFailed && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" disabled={cleanupRetryBusy} onClick={() => void retryPendingVideoCleanup()} className="shrink-0 font-semibold underline underline-offset-2 disabled:opacity-60">
                {t(cleanupRetryBusy ? 'videoManage.retryingCleanup' : 'videoManage.retryCleanup')}
              </button>
            </div>
          )}
          {uploadsError && page !== 'home' && (
            <p role="alert" className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {uploadsError}
            </p>
          )}
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
