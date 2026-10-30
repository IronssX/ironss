import { Check, LogIn, UserRound } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useLanguage } from '@/hooks/useLanguage';

interface ChannelHeaderProps {
  username: string;
  avatarUrl: string | null;
  description: string | null;
  subscriberCount: number;
  videoCount: number;
  isOwnChannel: boolean;
  isSignedIn: boolean;
  isSubscribed: boolean;
  isBusy: boolean;
  subscriptionError: string | null;
  onToggleSubscription: () => void;
  onSignIn: () => void;
}

export function ChannelHeader({
  username,
  avatarUrl,
  description,
  subscriberCount,
  videoCount,
  isOwnChannel,
  isSignedIn,
  isSubscribed,
  isBusy,
  subscriptionError,
  onToggleSubscription,
  onSignIn,
}: ChannelHeaderProps) {
  const { language, t } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';

  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-surface-border bg-surface p-6 shadow-[0_0_40px_-12px_rgba(176,38,255,0.5)] sm:flex-row sm:items-start sm:p-8">
      <UserAvatar name={username} imageUrl={avatarUrl} className="h-24 w-24 shrink-0 text-3xl sm:h-28 sm:w-28" />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neon-300">{t('channel.title')}</p>
          <h1 className="mt-1 truncate text-2xl font-bold text-white sm:text-3xl">{username}</h1>
          <p className="mt-2 text-sm text-gray-400">
            <span className="font-semibold text-gray-200">{subscriberCount.toLocaleString(locale)}</span> {t('channel.subscribers')}
            <span className="mx-2 text-gray-600">&middot;</span>
            <span className="font-semibold text-gray-200">{videoCount.toLocaleString(locale)}</span> {t('channel.videos')}
          </p>
        </div>

        <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-300">
          {description ?? t('channel.noDescription')}
        </p>

        <div className="flex flex-col gap-2">
          {isOwnChannel ? (
            <span className="inline-flex w-fit items-center gap-2 rounded-lg border border-neon-500/40 bg-neon-500/10 px-4 py-2 text-sm font-medium text-neon-200">
              <UserRound className="h-4 w-4" />
              {t('channel.own')}
            </span>
          ) : !isSignedIn ? (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-lg bg-neon-500 px-5 text-sm font-medium text-white transition-colors hover:bg-neon-400"
            >
              <LogIn className="h-4 w-4" />
              {t('channel.signInToSubscribe')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleSubscription}
              disabled={isBusy}
              aria-pressed={isSubscribed}
              className={`group inline-flex h-11 w-fit items-center gap-2 rounded-lg px-5 text-sm font-medium transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                isSubscribed
                  ? 'border border-surface-border text-gray-200 hover:border-red-400/60 hover:text-red-200'
                  : 'bg-neon-500 text-white shadow-[0_0_20px_-6px_rgba(176,38,255,0.9)] hover:bg-neon-400'
              }`}
            >
              {isSubscribed && <Check className="h-4 w-4" />}
              {isBusy ? t('profile.saving') : isSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
            </button>
          )}
          {subscriptionError && (
            <p role="alert" className="text-sm text-red-300">
              {subscriptionError}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
