import { BellRing, Library, Users } from 'lucide-react';
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
import type { Page } from '@/types/navigation';
import type { CategoryFilter } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';

function App() {
  const { t } = useLanguage();
  const [page, setPage] = useState<Page>(() => (new URLSearchParams(window.location.search).has('video') ? 'watch' : 'home'));
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('video'));
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
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

  const selectedVideo = allUploadedVideos.find((video) => video.id === selectedVideoId) ?? null;

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const navigate = (nextPage: Page) => {
    if (nextPage !== 'watch') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('video');
      window.history.replaceState(window.history.state, '', currentUrl);
    }
    setPage(nextPage);
    setIsSidebarOpen(false);
    scrollToTop();
  };

  const openVideo = (videoId: string) => {
    setSelectedVideoId(videoId);
    const videoUrl = new URL(window.location.href);
    videoUrl.searchParams.set('video', videoId);
    window.history.replaceState(window.history.state, '', videoUrl);
    navigate('watch');
  };

  const openChannel = (channelId: string) => {
    setSelectedChannelId(channelId);
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
          <PlaceholderPage
            icon={BellRing}
            title={t('placeholder.notificationsTitle')}
            message={t('placeholder.notificationsMessage')}
            actionLabel={t('placeholder.backHome')}
            onAction={() => navigate('home')}
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
            videos={allUploadedVideos.filter((video) => video.ownerId === selectedChannelId)}
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
