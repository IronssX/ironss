import { ArrowLeft, Users } from 'lucide-react';
import { ChannelHeader } from '@/components/ChannelHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/hooks/useAuth';
import { useChannel } from '@/hooks/useChannel';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import type { Page } from '@/types/navigation';
import type { Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';

interface ChannelPageProps {
  channelId: string;
  videos: Video[];
  onSelectVideo: (videoId: string) => void;
  onNavigate: (page: Page) => void;
}

export function ChannelPage({ channelId, videos, onSelectVideo, onNavigate }: ChannelPageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { channel, avatarUrl, isLoading, error, isSubscriptionBusy, subscriptionError, toggleSubscription } =
    useChannel(channelId);

  if (isLoading) return <LoadingSpinner label={t('loading.channel')} />;

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    );
  }

  if (!channel) {
    return (
      <PlaceholderPage
        icon={Users}
        title={t('placeholder.channelMissingTitle')}
        message={t('placeholder.channelMissingMessage')}
        actionLabel={t('placeholder.backHome')}
        onAction={() => onNavigate('home')}
      />
    );
  }

  return (
    <div className="flex w-full animate-fade-in flex-col gap-8">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="flex w-fit items-center gap-2 rounded-lg text-sm font-medium text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('channel.backHome')}
      </button>

      <ChannelHeader
        username={channel.profile.username}
        avatarUrl={avatarUrl}
        description={channel.profile.channelDescription}
        subscriberCount={channel.subscriberCount}
        videoCount={videos.length}
        isOwnChannel={user?.id === channel.profile.id}
        isSignedIn={Boolean(user)}
        isSubscribed={channel.isSubscribed}
        isBusy={isSubscriptionBusy}
        subscriptionError={subscriptionError}
        onToggleSubscription={toggleSubscription}
        onSignIn={() => onNavigate('login')}
      />

      <section className="flex flex-col gap-5">
        <h2 className="text-lg font-bold text-white">{t('channel.videoList')}</h2>
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-surface-border bg-surface/50 px-6 py-12 text-center text-sm text-gray-400">
            {t('channel.noVideos')}
          </p>
        )}
      </section>
    </div>
  );
}
