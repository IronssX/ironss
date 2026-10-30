import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, LogIn, LogOut, UserPlus, UserRound } from 'lucide-react';
import { ChannelDescriptionForm } from '@/components/ChannelDescriptionForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import { describeChannelError, updateChannelDescription } from '@/services/channelService';
import type { Page } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';

interface ProfilePageProps {
  onNavigate: (page: Page) => void;
  onOpenChannel: (channelId: string) => void;
}

export function ProfilePage({ onNavigate, onOpenChannel }: ProfilePageProps) {
  const { language, t } = useLanguage();
  const { user, profile, avatarUrl, isLoading, profileError, notice, dismissNotice, uploadAvatar, signOut, retryProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) return <LoadingSpinner label={t('loading.account')} />;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md animate-fade-in flex-col items-center justify-center gap-5 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-neon-300/15 bg-neon-300/[0.06]">
          <LogIn className="h-7 w-7 text-neon-200" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('profile.guest')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            {t('profile.guestDescription')}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="primary-button h-11 px-5"
          >
            <LogIn className="h-4 w-4" />
            {t('auth.loginTitle')}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="ghost-button h-11 px-5"
          >
            <UserPlus className="h-4 w-4" />
            {t('auth.register')}
          </button>
        </div>
      </div>
    );
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsBusy(true);
    setActionError(null);
    const error = await uploadAvatar(file);
    setIsBusy(false);
    if (error) setActionError(error);
  };

  const handleSignOut = async () => {
    setIsBusy(true);
    setActionError(null);
    const error = await signOut();
    setIsBusy(false);
    if (error) {
      setActionError(error);
      return;
    }
    onNavigate('home');
  };

  const displayName = profile?.username ?? t('topbar.account');

  const handleSaveDescription = async (description: string): Promise<string | null> => {
    try {
      await updateChannelDescription(user.id, description);
      retryProfile();
      return null;
    } catch (saveError) {
      return describeChannelError(saveError, language);
    }
  };

  return (
    <div className="auth-shell mx-auto flex w-full max-w-2xl animate-fade-in flex-col gap-7 rounded-[28px] border border-white/[0.08] p-6 sm:p-9">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
        <div className="relative">
          <UserAvatar name={displayName} imageUrl={avatarUrl} className="h-28 w-28 text-3xl" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy || !profile}
            aria-label={t('profile.changePhoto')}
            className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-neon-300 transition-all duration-200 hover:border-neon-500 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-neon-300">{t('profile.title')}</p>
          <h1 className="mt-1 truncate text-2xl font-bold text-white">{profile?.username ?? t('profile.user')}</h1>
          <p className="mt-1 truncate text-sm text-gray-400">{user.email}</p>
          <p className="mt-3 text-xs text-gray-500">{t('profile.photoRequirements')}</p>
        </div>
      </div>

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-neon-500/40 bg-neon-500/10 px-4 py-3 text-sm text-neon-100">
          <p>{notice}</p>
          <button
            type="button"
            onClick={dismissNotice}
            className="shrink-0 text-xs font-medium text-neon-300 transition-colors hover:text-white"
          >
            {t('profile.close')}
          </button>
        </div>
      )}

      {profileError && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <p>{profileError}</p>
          <button
            type="button"
            onClick={retryProfile}
            className="self-start rounded-md border border-red-300/40 px-3 py-1.5 text-xs font-medium text-red-100 transition-colors hover:bg-red-500/20 sm:self-auto"
          >
            {t('profile.retry')}
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </p>
      )}

      {profile && (
        <div className="flex flex-col gap-3 border-t border-surface-border pt-6">
          <ChannelDescriptionForm initialValue={profile.channelDescription} onSave={handleSaveDescription} />
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-surface-border pt-6 sm:flex-row sm:justify-end">
        {profile && (
          <button
            type="button"
            onClick={() => onOpenChannel(profile.id)}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-neon-500/50 px-5 text-sm font-medium text-neon-300 transition-colors hover:bg-neon-500/10"
          >
            <UserRound className="h-4 w-4" />
            {t('profile.viewChannel')}
          </button>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isBusy}
          className="flex h-11 items-center justify-center gap-2 rounded-lg border border-surface-border px-5 text-sm font-medium text-gray-200 transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  );
}
