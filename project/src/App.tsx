import { Library, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { useUploadedVideos } from '@/hooks/useUploadedVideos';
import { ChannelPage } from '@/pages/ChannelPage';
import { FeedPage } from '@/pages/FeedPage';
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
import { fetchVideoById } from '@/services/videoService';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

interface RouteLocation {
  page: Page;
  videoId: string | null;
  channelId: string | null;
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
  if (videoId) return { page: 'watch', videoId, channelId: null };
  if (channelId) return { page: 'channel', videoId: null, channelId };
  const requestedPage = params.get('page');
  return {
    page: requestedPage && routablePages.has(requestedPage) ? requestedPage as Page : 'home',
    videoId: null,
    channelId: null,
  };
}

function App() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const notificationState = useNotifications(user?.id ?? null);
  const [initialRoute] = useState(getRouteLocation);
  const [page, setPage] = useState<Page>(initialRoute.page);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(initialRoute.videoId);
  const [selectedVideoOverride, setSelectedVideoOverride] = useState<Video | null>(null);
  const [isSelectedVideoLoading, setIsSelectedVideoLoading] = useState(initialRoute.videoId !== null);
  const [selectedVideoLoadFailed, setSelectedVideoLoadFailed] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(initialRoute.channelId);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const handleViewRecorded = (videoId: string, views: number) => {
    setViewOverrides((current) => ({ ...current, [videoId]: views }));
  };

  const trendingVideos = useMemo(
    () => [...allVideos].sort((a, b) => b.views - a.views),
    [allVideos],
  );

  const selectedVideo = selectedVideoOverride?.id === selectedVideoId
    ? selectedVideoOverride
    : allUploadedVideos.find((video) => video.id === selectedVideoId) ?? null;

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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const navigate = (nextPage: Page, target?: { videoId?: string; channelId?: string }) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete('video');
    nextUrl.searchParams.delete('channel');
    nextUrl.searchParams.delete('page');
    if (nextPage === 'watch' && target?.videoId) {
      nextUrl.searchParams.set('video', target.videoId);
    } else if (nextPage === 'channel' && target?.channelId) {
      nextUrl.searchParams.set('channel', target.channelId);
    } else if (nextPage !== 'home') {
      nextUrl.searchParams.set('page', nextPage);
    }
    if (nextUrl.href !== window.location.href) {
      window.history.pushState({ page: nextPage }, '', nextUrl);
    }
    setPage(nextPage);
    setIsSidebarOpen(false);
    scrollToTop();
  };

  useEffect(() => {
    const handlePopState = () => {
      const route = getRouteLocation();
      setPage(route.page);
      setSelectedVideoId(route.videoId);
      setSelectedVideoOverride(null);
      setIsSelectedVideoLoading(route.videoId !== null);
      setSelectedVideoLoadFailed(false);
      setSelectedChannelId(route.channelId);
      setIsSidebarOpen(false);
      scrollToTop();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    if (page !== 'home' && page !== 'explore') {
      navigate('home');
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
          <FeedPage
            title={t('feed.homeTitle')}
            description={t('feed.homeDescription')}
            videos={allVideos}
            query={query}
            category={category}
            onCategoryChange={setCategory}
            onResetFilters={resetFilters}
            onSelectVideo={openVideo}
            onOpenChannel={openChannel}
            onNavigate={navigate}
            isHome
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
            videos={allShorts}
            schemaMissing={shortsSchemaMissing}
            onNavigate={navigate}
            onOpenChannel={openChannel}
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
            error={notificationState.error}
            actionError={notificationState.actionError}
            isSignedIn={Boolean(user)}
            onRefresh={() => void notificationState.refresh()}
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
            relatedVideos={allUploadedVideos.filter((video) => video.id !== selectedVideo.id)}
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

      <div className="flex pt-[76px]">
        <Sidebar
          activePage={page}
          isOpen={isSidebarOpen}
          onNavigate={navigate}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-9">
          {uploadsError && (
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
