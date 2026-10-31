import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, ImagePlus, LogIn, LogOut, Trash2, UserPlus, UserRound } from 'lucide-react';
import { ProfileSettingsForm } from '@/components/ProfileSettingsForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserAvatar } from '@/components/UserAvatar';
import { PROFILE_COVER_THEMES, getProfileCoverClass } from '@/config/profileCovers';
import { useAuth } from '@/hooks/useAuth';
import {
  getAvatarUrl,
  updateProfileCover,
  updateProfileDetails,
  uploadProfileCover,
  validateAvatarFile,
} from '@/services/profileService';
import type { CoverTheme, Profile } from '@/types/profile';
import type { Page } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

interface ProfilePageProps {
  onNavigate: (page: Page) => void;
  onOpenChannel: (channelId: string) => void;
}

export function ProfilePage({ onNavigate, onOpenChannel }: ProfilePageProps) {
  const { language, t } = useLanguage();
  const {
    user,
    profile,
    avatarUrl,
    isLoading,
    profileError,
    notice,
    dismissNotice,
    uploadAvatar,
    signOut,
    retryProfile,
  } = useAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [profileSnapshot, setProfileSnapshot] = useState<Profile | null>(profile);
  const [isBusy, setIsBusy] = useState(false);
  const [isCoverBusy, setIsCoverBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [coverSaved, setCoverSaved] = useState(false);

  useEffect(() => setProfileSnapshot(profile), [profile]);

  if (isLoading) return <LoadingSpinner label={t('loading.account')} />;

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md animate-fade-in flex-col items-center justify-center gap-5 text-center">
        <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-neon-300/15 bg-neon-300/[0.06]">
          <LogIn className="h-7 w-7 text-neon-200" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">{t('profile.guest')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">{t('profile.guestDescription')}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => onNavigate('login')} className="primary-button h-11 px-5">
            <LogIn className="h-4 w-4" />
            {t('auth.loginTitle')}
          </button>
          <button type="button" onClick={() => onNavigate('register')} className="ghost-button h-11 px-5">
            <UserPlus className="h-4 w-4" />
            {t('auth.register')}
          </button>
        </div>
      </div>
    );
  }

  const displayName = profileSnapshot?.username ?? t('topbar.account');

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

  const handleCoverChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !profileSnapshot) return;

    const validationError = validateAvatarFile(file, language);
    if (validationError) {
      setCoverError(validationError);
      return;
    }

    setIsCoverBusy(true);
    setCoverError(null);
    setCoverSaved(false);
    try {
      const path = await uploadProfileCover(user.id, file);
      await updateProfileCover(user.id, profileSnapshot.coverTheme, path, profileSnapshot.coverImagePath);
      setProfileSnapshot((current) => current ? { ...current, coverImagePath: path } : current);
      setCoverSaved(true);
      retryProfile();
    } catch (error) {
      logSupabaseFailure('profile', 'uploadCover', error);
      setCoverError(t('profile.coverFailed'));
    } finally {
      setIsCoverBusy(false);
    }
  };

  const handleCoverTheme = async (theme: CoverTheme) => {
    if (!profileSnapshot) return;
    setIsCoverBusy(true);
    setCoverError(null);
    setCoverSaved(false);
    try {
      await updateProfileCover(user.id, theme, null, profileSnapshot.coverImagePath);
      setProfileSnapshot((current) => current
        ? { ...current, coverTheme: theme, coverImagePath: null }
        : current);
      setCoverSaved(true);
      retryProfile();
    } catch (error) {
      logSupabaseFailure('profile', 'updateCoverTheme', error);
      setCoverError(t('profile.coverFailed'));
    } finally {
      setIsCoverBusy(false);
    }
  };

  const handleSaveProfile = async (username: string, description: string): Promise<string | null> => {
    try {
      await updateProfileDetails(user.id, username, description);
      setProfileSnapshot((current) => current
        ? { ...current, username: username.trim(), channelDescription: description.trim() || null }
        : current);
      retryProfile();
      return null;
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_USERNAME') return t('profile.usernameInvalid');
      if (error instanceof Error && error.message === 'USERNAME_TAKEN') return t('profile.usernameTaken');
      if (error instanceof Error && error.message === 'INVALID_PROFILE_DESCRIPTION') return t('channel.descriptionTooLong', { count: 500 });
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        return t('profile.usernameTaken');
      }
      return t('profile.updateFailed');
    }
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

  return (
    <div className="mx-auto flex w-full max-w-4xl animate-fade-in flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{t('profile.title')}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">{t('profile.editHeading')}</h1>
          <p className="mt-2 text-sm text-gray-400">{t('profile.editSubtitle')}</p>
        </div>
        {profileSnapshot && (
          <button
            type="button"
            onClick={() => onOpenChannel(profileSnapshot.id)}
            className="secondary-button h-10 px-4 text-xs"
          >
            <UserRound className="h-4 w-4" />
            {t('profile.viewChannel')}
          </button>
        )}
      </header>

      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-lg border border-neon-500/40 bg-neon-500/10 px-4 py-3 text-sm text-neon-100">
          <p>{notice}</p>
          <button type="button" onClick={dismissNotice} className="shrink-0 text-xs font-medium text-neon-300 hover:text-white">
            {t('profile.close')}
          </button>
        </div>
      )}

      {profileError && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <p>{profileError}</p>
          <button type="button" onClick={retryProfile} className="self-start rounded-md border border-red-300/40 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-500/20 sm:self-auto">
            {t('profile.retry')}
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {actionError}
        </p>
      )}

      {profileSnapshot && (
        <>
          <section className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#141218] shadow-[0_24px_70px_-44px_rgba(174,89,255,.55)]">
            <div className={`relative h-36 overflow-hidden sm:h-52 ${getProfileCoverClass(profileSnapshot.coverTheme)}`}>
              {profileSnapshot.coverImagePath && (
                <img
                  src={getAvatarUrl(profileSnapshot.coverImagePath)}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141218]/70 to-transparent" aria-hidden="true" />
              <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80">
                {t('profile.preview')}
              </span>
            </div>
            <div className="px-5 pb-5 sm:px-7 sm:pb-7">
              <div className="-mt-11 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end">
                <div className="relative w-fit rounded-full p-1.5 shadow-[0_0_30px_rgba(181,83,255,.3)]">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-neon-300 via-fuchsia-500 to-indigo-500" aria-hidden="true" />
                  <UserAvatar name={displayName} imageUrl={avatarUrl} className="relative h-24 w-24 border-4 border-[#141218] text-2xl sm:h-28 sm:w-28" />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isBusy}
                    aria-label={t('profile.changePhoto')}
                    className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#141218] bg-neon-500 text-white hover:bg-neon-400 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="min-w-0 pb-1">
                  <h2 className="truncate text-xl font-bold text-white sm:text-2xl">{displayName}</h2>
                  <p className="mt-0.5 truncate text-sm text-neon-200">@{displayName}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">{t('profile.photoRequirements')}</p>
            </div>
          </section>

          <section className="rounded-[24px] border border-white/[0.08] bg-[#141218] p-5 sm:p-7">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">{t('profile.cover')}</h2>
              <p className="mt-1 text-xs text-gray-500">{t('profile.coverPhotoRequirements')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PROFILE_COVER_THEMES.map(({ id, className }) => {
                const isSelected = profileSnapshot.coverTheme === id && !profileSnapshot.coverImagePath;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void handleCoverTheme(id)}
                    disabled={isCoverBusy}
                    aria-pressed={isSelected}
                    className={`group overflow-hidden rounded-xl border text-left transition-colors disabled:opacity-60 ${
                      isSelected ? 'border-neon-300 ring-2 ring-neon-400/30' : 'border-white/10 hover:border-neon-300/50'
                    }`}
                  >
                    <span className={`block h-16 ${className}`} aria-hidden="true" />
                    <span className="block truncate px-2.5 py-2 text-xs font-medium text-gray-200">
                      {t(`profile.coverTheme.${id}`)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={isCoverBusy}
                className="secondary-button h-10 px-4 text-xs disabled:opacity-50"
              >
                <ImagePlus className="h-4 w-4" />
                {isCoverBusy ? t('profile.uploading') : t('profile.uploadCover')}
              </button>
              {profileSnapshot.coverImagePath && (
                <button
                  type="button"
                  onClick={() => void handleCoverTheme('purple-neon')}
                  disabled={isCoverBusy}
                  className="ghost-button h-10 px-4 text-xs text-gray-300 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('profile.removeCover')}
                </button>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverChange}
                className="hidden"
              />
              {coverSaved && <p role="status" className="text-sm text-neon-200">{t('profile.coverSaved')}</p>}
            </div>
            {coverError && (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {coverError}
              </p>
            )}
          </section>

          <section className="rounded-[24px] border border-white/[0.08] bg-[#141218] p-5 sm:p-7">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">{t('profile.profileDetails')}</h2>
              <p className="mt-1 text-xs text-gray-500">{t('profile.publicProfileFields')}</p>
            </div>
            <ProfileSettingsForm
              initialUsername={profileSnapshot.username}
              initialDescription={profileSnapshot.channelDescription}
              onSave={handleSaveProfile}
            />
          </section>
        </>
      )}

      <div className="flex justify-end border-t border-white/[0.08] pt-5">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isBusy}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {t('profile.signOut')}
        </button>
      </div>
    </div>
  );
}
