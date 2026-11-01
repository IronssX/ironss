import { ArrowUpRight, UserRoundMinus, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import {
  describeChannelError,
  fetchSubscribedChannels,
  unsubscribeFromChannel,
  type SubscribedChannel,
} from '@/services/channelService';
import { getAvatarUrl } from '@/services/profileService';
import type { Page } from '@/types/navigation';

interface SubscriptionsPageProps {
  onNavigate: (page: Page) => void;
  onOpenChannel: (channelId: string) => void;
}

export function SubscriptionsPage({ onNavigate, onOpenChannel }: SubscriptionsPageProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [busyChannelId, setBusyChannelId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    if (!user) {
      setChannels([]);
      setLoadError(null);
      setIsLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    setLoadError(null);
    fetchSubscribedChannels(user.id)
      .then((result) => {
        if (isCurrent) setChannels(result);
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setChannels([]);
        setLoadError(error);
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [retryCount, user]);

  const handleUnsubscribe = async (channelId: string) => {
    if (!user) return;
    setBusyChannelId(channelId);
    setActionError(null);
    try {
      await unsubscribeFromChannel(user.id, channelId);
      setChannels((current) => current.filter((channel) => channel.id !== channelId));
    } catch (error) {
      setActionError(error);
    } finally {
      setBusyChannelId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7">
      <header>
        <p className="eyebrow">{t('subscriptions.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
          {t('subscriptions.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
          {t('subscriptions.description')}
        </p>
      </header>

      {!user ? (
        <section className="empty-state flex flex-col items-center gap-4 rounded-[26px] border border-dashed border-white/10 px-6 py-14 text-center">
          <Users className="h-8 w-8 text-neon-200" />
          <div>
            <h2 className="text-lg font-semibold text-white">{t('subscriptions.signInTitle')}</h2>
            <p className="mt-2 text-sm text-gray-400">{t('subscriptions.signInDescription')}</p>
          </div>
          <button type="button" onClick={() => onNavigate('login')} className="primary-button h-10 px-5">
            {t('topbar.signIn')}
          </button>
        </section>
      ) : isLoading ? (
        <p role="status" className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-8 text-center text-sm text-gray-400">
          {t('subscriptions.loading')}
        </p>
      ) : loadError ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-5">
          <p role="alert" className="text-sm text-red-200">{describeChannelError(loadError, language)}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="secondary-button mt-4 h-10 px-4"
          >
            {t('subscriptions.retry')}
          </button>
        </section>
      ) : channels.length === 0 ? (
        <section className="empty-state flex flex-col items-center gap-4 rounded-[26px] border border-dashed border-white/10 px-6 py-14 text-center">
          <Users className="h-8 w-8 text-neon-200" />
          <div>
            <h2 className="text-lg font-semibold text-white">{t('subscriptions.emptyTitle')}</h2>
            <p className="mt-2 text-sm text-gray-400">{t('subscriptions.emptyDescription')}</p>
          </div>
          <button type="button" onClick={() => onNavigate('explore')} className="primary-button h-10 px-5">
            {t('feed.exploreAction')}
          </button>
        </section>
      ) : (
        <>
          {actionError && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">
              {describeChannelError(actionError, language)}
            </p>
          )}
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 transition-colors hover:border-neon-300/20"
              >
                <button
                  type="button"
                  onClick={() => onOpenChannel(channel.id)}
                  aria-label={t('subscriptions.openChannel', { name: channel.username })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <UserAvatar
                    name={channel.username}
                    imageUrl={channel.avatarPath ? getAvatarUrl(channel.avatarPath) : null}
                    className="h-12 w-12 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{channel.username}</span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      {channel.description || t('channel.noDescription')}
                    </span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-500" />
                </button>
                <button
                  type="button"
                  onClick={() => void handleUnsubscribe(channel.id)}
                  disabled={busyChannelId === channel.id}
                  aria-label={t('subscriptions.disconnectFrom', { name: channel.username })}
                  className="icon-button shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserRoundMinus className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
