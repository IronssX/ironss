import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  describeChannelError,
  fetchIsSubscribed,
  fetchSubscriberCount,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '@/services/channelService';
import { fetchProfile, getAvatarUrl } from '@/services/profileService';
import { fetchVideosByOwner } from '@/services/videoService';
import type { Profile } from '@/types/profile';
import { useLanguage } from '@/hooks/useLanguage';

interface ChannelData {
  profile: Profile;
  videos: Awaited<ReturnType<typeof fetchVideosByOwner>>;
  subscriberCount: number;
  isSubscribed: boolean;
}

export interface UseChannelResult {
  channel: ChannelData | null;
  avatarUrl: string | null;
  isLoading: boolean;
  error: string | null;
  isSubscriptionBusy: boolean;
  subscriptionError: string | null;
  toggleSubscription: () => Promise<boolean>;
}

export function useChannel(channelId: string): UseChannelResult {
  const { user } = useAuth();
  const { language } = useLanguage();
  const viewerId = user?.id ?? null;
  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [isSubscriptionBusy, setIsSubscriptionBusy] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!channelId) {
        setChannel(null);
        setIsLoading(false);
        setLoadError(null);
        return;
      }

      setIsLoading(true);
      setChannel(null);
      setLoadError(null);
      setSubscriptionError(null);
      try {
        const [profile, subscriberCount, isSubscribed, videos] = await Promise.all([
          fetchProfile(channelId),
          fetchSubscriberCount(channelId),
          viewerId ? fetchIsSubscribed(viewerId, channelId) : Promise.resolve(false),
          fetchVideosByOwner(channelId),
        ]);
        if (cancelled) return;
        setChannel(profile ? { profile, videos, subscriberCount, isSubscribed } : null);
      } catch (loadError) {
        if (cancelled) return;
        setChannel(null);
        setLoadError(loadError);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [channelId, viewerId]);

  useEffect(() => {
    const refreshChannelVideos = () => {
      if (!channelId) return;
      void fetchVideosByOwner(channelId)
        .then((videos) => {
          setChannel((current) => current ? { ...current, videos } : current);
          setLoadError(null);
        })
        .catch((error: unknown) => setLoadError(error));
    };
    window.addEventListener('ironss:videos-changed', refreshChannelVideos);
    return () => window.removeEventListener('ironss:videos-changed', refreshChannelVideos);
  }, [channelId]);

  const toggleSubscription = async (): Promise<boolean> => {
    if (!channel || !viewerId || channel.profile.id === viewerId) return false;

    setIsSubscriptionBusy(true);
    setSubscriptionError(null);
    try {
      if (channel.isSubscribed) {
        await unsubscribeFromChannel(viewerId, channelId);
      } else {
        await subscribeToChannel(channelId);
      }
      const [subscriberCount, isSubscribed] = await Promise.all([
        fetchSubscriberCount(channelId),
        fetchIsSubscribed(viewerId, channelId),
      ]);
      setChannel((current) => (current ? { ...current, subscriberCount, isSubscribed } : current));
      return true;
    } catch (toggleError) {
      setSubscriptionError(toggleError);
      return false;
    } finally {
      setIsSubscriptionBusy(false);
    }
  };

  return {
    channel,
    avatarUrl: channel?.profile.avatarPath ? getAvatarUrl(channel.profile.avatarPath) : null,
    isLoading,
    error: loadError ? describeChannelError(loadError, language) : null,
    isSubscriptionBusy,
    subscriptionError: subscriptionError ? describeChannelError(subscriptionError, language) : null,
    toggleSubscription,
  };
}
