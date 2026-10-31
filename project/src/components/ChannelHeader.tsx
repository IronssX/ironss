import { Check, LogIn, UserRound } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { useLanguage } from '@/hooks/useLanguage';
import type { CoverTheme } from '@/types/profile';
import { getProfileCoverClass } from '@/config/profileCovers';

interface ChannelHeaderProps {
  username: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  coverTheme: CoverTheme;
  description: string | null;
  subscriberCount: number;
  videoCount: number;
  totalViews: number;
  isOwnChannel: boolean;
  isSignedIn: boolean;
  isSubscribed: boolean;
  isBusy: boolean;
  subscriptionError: string | null;
  onToggleSubscription: () => void;
  onSignIn: () => void;
  onEditProfile: () => void;
  onShare: () => void;
}

export function ChannelHeader({
  username,
  avatarUrl,
  coverUrl,
  coverTheme,
  description,
  subscriberCount,
  videoCount,
  totalViews,
  isOwnChannel,
  isSignedIn,
  isSubscribed,
  isBusy,
  subscriptionError,
  onToggleSubscription,
  onSignIn,
  onEditProfile,
  onShare,
}: ChannelHeaderProps) {
  const { language, t } = useLanguage();
  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  const compactViews = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(totalViews);

  return (
    <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#141218] shadow-[0_24px_70px_-44px_rgba(174,89,255,.65)]">
      <div className={`relative h-40 overflow-hidden sm:h-56 ${getProfileCoverClass(coverTheme)}`}>
        {coverUrl && <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141218] via-[#141218]/15 to-black/5" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-300/70 to-transparent" aria-hidden="true" />
      </div>

      <div className="px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="-mt-12 flex flex-col gap-4 sm:-mt-16 sm:flex-row sm:items-end">
          <div className="relative w-fit rounded-full p-1.5 shadow-[0_0_35px_rgba(181,83,255,.3)]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-300 via-fuchsia-500 to-indigo-500" aria-hidden="true" />
            <UserAvatar name={username} imageUrl={avatarUrl} className="relative h-24 w-24 border-4 border-[#141218] text-3xl sm:h-32 sm:w-32" />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:pb-1">
            <div className="min-w-0">
              <p className="eyebrow">{t('profile.publicProfile')}</p>
              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight text-white sm:text-3xl">{username}</h1>
              <p className="mt-0.5 truncate text-sm font-medium text-neon-200">@{username}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isOwnChannel ? (
                <button type="button" onClick={onEditProfile} className="secondary-button h-10 px-4 text-xs">
                  <UserRound className="h-4 w-4" />
                  {t('profile.editProfile')}
                </button>
              ) : !isSignedIn ? (
                <button type="button" onClick={onSignIn} className="primary-button h-10 px-4 text-xs">
                  <LogIn className="h-4 w-4" />
                  {t('channel.signInToSubscribe')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleSubscription}
                  disabled={isBusy}
                  aria-pressed={isSubscribed}
                  className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSubscribed
                      ? 'border border-white/10 bg-white/[0.035] text-gray-200 hover:border-red-400/40 hover:text-red-200'
                      : 'primary-button'
                  }`}
                >
                  {isSubscribed && <Check className="h-4 w-4" />}
                  {isBusy ? t('profile.saving') : isSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                </button>
              )}
              <button type="button" onClick={onShare} className="secondary-button h-10 px-4 text-xs">
                {t('profile.share')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.07] rounded-2xl border border-white/[0.07] bg-white/[0.025] py-3 text-center">
          <div className="px-2">
            <p className="text-lg font-bold text-white">{subscriberCount.toLocaleString(locale)}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">{t('profile.connections')}</p>
          </div>
          <div className="px-2">
            <p className="text-lg font-bold text-white">{videoCount.toLocaleString(locale)}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">{t('profile.videos')}</p>
          </div>
          <div className="px-2">
            <p className="text-lg font-bold text-white">{compactViews}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs">{t('profile.views')}</p>
          </div>
        </div>

        <p className="mt-5 whitespace-pre-line break-words text-sm leading-relaxed text-gray-300">
          {description || t('channel.noDescription')}
        </p>

        {subscriptionError && (
          <p role="alert" className="mt-3 text-sm text-red-300">{subscriptionError}</p>
        )}
      </div>
    </section>
  );
}
