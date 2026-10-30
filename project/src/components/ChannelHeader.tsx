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
    <section className="relative flex flex-col gap-6 overflow-hidden rounded-[26px] border border-white/[0.08] bg-[radial-gradient(ellipse_at_85%_0%,rgba(162,112,205,.12),transparent_42%),#141218] p-6 sm:flex-row sm:items-start sm:p-8">
      <div className="absolute right-8 top-8 h-24 w-24 rounded-full bg-neon-500/10 blur-3xl" aria-hidden="true" />
      <UserAvatar name={username} imageUrl={avatarUrl} className="relative h-24 w-24 shrink-0 text-3xl sm:h-28 sm:w-28" />

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="eyebrow">{t('channel.title')}</p>
          <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">{username}</h1>
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
                  ? 'border border-white/10 bg-white/[0.035] text-gray-200 hover:border-red-400/40 hover:text-red-200'
                  : 'primary-button'
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
