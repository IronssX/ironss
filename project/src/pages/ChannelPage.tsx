import { ArrowLeft, Users } from 'lucide-react';
import { ChannelHeader } from '@/components/ChannelHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { VideoCard } from '@/components/VideoCard';
import { useAuth } from '@/hooks/useAuth';
import { useChannel } from '@/hooks/useChannel';
import { getAvatarUrl } from '@/services/profileService';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import type { Page } from '@/types/navigation';
import type { Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import { useState } from 'react';

interface ChannelPageProps {
  channelId: string;
  onSelectVideo: (videoId: string, video?: Video) => void;
  onNavigate: (page: Page) => void;
}

export function ChannelPage({ channelId, onSelectVideo, onNavigate }: ChannelPageProps) {
  const { t } = useLanguage();
  const [videoType, setVideoType] = useState<'standard' | 'short'>('standard');
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
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

  const videos = channel.videos;
  const displayedVideos = videos.filter((video) => (video.videoType ?? 'standard') === videoType);
  const totalViews = videos.reduce((total, video) => total + video.views, 0);

  const shareProfile = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('channel', channel.profile.id);
    setShareFeedback(null);
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${channel.profile.username} | IRONSS`,
            url: url.toString(),
          });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable.');
      await navigator.clipboard.writeText(url.toString());
      setShareFeedback(t('profile.linkCopied'));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareFeedback(t('profile.shareFailed'));
    }
  };

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
        coverUrl={channel.profile.coverImagePath ? getAvatarUrl(channel.profile.coverImagePath) : null}
        coverTheme={channel.profile.coverTheme}
        description={channel.profile.channelDescription}
        subscriberCount={channel.subscriberCount}
        videoCount={videos.length}
        totalViews={totalViews}
        isOwnChannel={user?.id === channel.profile.id}
        isSignedIn={Boolean(user)}
        isSubscribed={channel.isSubscribed}
        isBusy={isSubscriptionBusy}
        subscriptionError={subscriptionError}
        onToggleSubscription={toggleSubscription}
        onSignIn={() => onNavigate('login')}
        onEditProfile={() => onNavigate('profile')}
        onShare={() => void shareProfile()}
      />
      {shareFeedback && (
        <p role="status" className="-mt-6 text-sm text-neon-200">{shareFeedback}</p>
      )}

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{t('channel.videoList')}</h2>
          <div className="flex gap-2" role="group" aria-label={t('channel.videoList')}>
            {(['standard', 'short'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setVideoType(type)}
                aria-pressed={videoType === type}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  videoType === type
                    ? 'border-neon-400/40 bg-neon-400/10 text-neon-200'
                    : 'border-surface-border text-gray-400 hover:text-white'
                }`}
              >
                {t(type === 'short' ? 'channel.shorts' : 'channel.standardVideos')}
              </button>
            ))}
          </div>
        </div>
        {displayedVideos.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 sm:gap-y-8 xl:grid-cols-3 2xl:grid-cols-4">
            {displayedVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onSelect={(videoId) => onSelectVideo(videoId, video)}
              />
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
