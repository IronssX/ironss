import { Library, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import type { Page } from '@/types/navigation';
import type { CategoryFilter, Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

function App() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const notificationState = useNotifications(user?.id ?? null);
  const [page, setPage] = useState<Page>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('video')) return 'watch';
    if (params.has('channel')) return 'channel';
    return 'home';
  });
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('video'),
  );
  const [selectedVideoOverride, setSelectedVideoOverride] = useState<Video | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('channel'),
  );
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    videos: uploadedVideos,
    shorts: uploadedShorts,
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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const navigate = (nextPage: Page) => {
    const currentUrl = new URL(window.location.href);
    if (nextPage !== 'watch') currentUrl.searchParams.delete('video');
    if (nextPage !== 'channel') currentUrl.searchParams.delete('channel');
    window.history.replaceState(window.history.state, '', currentUrl);
    setPage(nextPage);
    setIsSidebarOpen(false);
    scrollToTop();
  };

  const openVideo = (videoId: string, video?: Video) => {
    setSelectedVideoId(videoId);
    setSelectedVideoOverride(video ?? null);
    const videoUrl = new URL(window.location.href);
    videoUrl.searchParams.set('video', videoId);
    window.history.replaceState(window.history.state, '', videoUrl);
    navigate('watch');
  };

  const openChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
    const channelUrl = new URL(window.location.href);
    channelUrl.searchParams.delete('video');
    channelUrl.searchParams.set('channel', channelId);
    window.history.replaceState(window.history.state, '', channelUrl);
    navigate('channel');
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
        return (
          <PlaceholderPage
            icon={Users}
            title={t('placeholder.subscriptionsTitle')}
            message={t('placeholder.subscriptionsMessage')}
            actionLabel={t('placeholder.backHome')}
            onAction={() => navigate('home')}
          />
        );
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
        if (!selectedVideo) {
          return (
            <PlaceholderPage
              icon={Library}
              title={t('placeholder.videoMissingTitle')}
              message={t('placeholder.videoMissingMessage')}
              actionLabel={t('placeholder.backHome')}
              onAction={() => navigate('home')}
            />
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
