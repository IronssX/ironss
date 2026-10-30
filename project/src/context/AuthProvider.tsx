import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { AuthContext, type AuthContextValue, type RegisterValues } from '@/context/authContext';
import { requireSupabase, supabase } from '@/lib/supabase';
import {
  fetchProfile,
  getAvatarUrl,
  uploadAvatar as uploadAvatarFile,
  validateAvatarFile,
} from '@/services/profileService';
import { describeAuthError } from '@/utils/authErrors';
import type { Profile } from '@/types/profile';
import { useLanguage } from '@/hooks/useLanguage';
import { translate, type TranslationKey } from '@/i18n';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

interface AuthNotice {
  key: TranslationKey;
  values?: Record<string, string | number>;
}

async function runAuthAction(
  actionName: string,
  action: () => Promise<string | null>,
  language: 'tr' | 'en',
): Promise<string | null> {
  try {
    return await action();
  } catch (error) {
    logSupabaseFailure('auth', actionName, error);
    return describeAuthError(error, language);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    let isCurrent = true;
    (async () => {
      try {
        const nextProfile = await fetchProfile(userId);
        if (!isCurrent) return;
        setProfile(nextProfile);
        setProfileError(nextProfile ? null : translate(language, 'auth.profileNotFound'));
      } catch (error) {
        if (!isCurrent) return;
        setProfile(null);
        setProfileError(describeAuthError(error, language));
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [userId, retryCount, language]);

  const signUp = ({ username, email, password }: RegisterValues) =>
    runAuthAction('signUp', async () => {
      const { data, error } = await requireSupabase().auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) {
        logSupabaseFailure('auth', 'signUp', error);
        return describeAuthError(error, language);
      }
      if (!data.session) return translate(language, 'auth.registerNoSession');
      setNotice({ key: 'auth.welcomeRegistered', values: { username } });
      return null;
    }, language);

  const signIn = (email: string, password: string) =>
    runAuthAction('signIn', async () => {
      const { error } = await requireSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        logSupabaseFailure('auth', 'signIn', error);
        return describeAuthError(error, language);
      }
      setNotice({ key: 'auth.welcomeBack' });
      return null;
    }, language);

  const signOut = () =>
    runAuthAction('signOut', async () => {
      const { error } = await requireSupabase().auth.signOut({ scope: 'local' });
      if (error) {
        logSupabaseFailure('auth', 'signOut', error);
        return describeAuthError(error, language);
      }
      setNotice(null);
      return null;
    }, language);

  const uploadAvatar = (file: File) =>
    runAuthAction('uploadAvatar', async () => {
      if (!user) return translate(language, 'auth.photoLoginRequired');
      const validationError = validateAvatarFile(file, language);
      if (validationError) return validationError;

      const path = await uploadAvatarFile(user.id, file, profile?.avatarPath ?? null);
      setProfile((current) => (current ? { ...current, avatarPath: path } : current));
      return null;
    }, language);

  const value: AuthContextValue = {
    user,
    profile,
    avatarUrl: profile?.avatarPath ? getAvatarUrl(profile.avatarPath) : null,
    isLoading,
    profileError,
    notice: notice ? translate(language, notice.key, notice.values) : null,
    dismissNotice: () => setNotice(null),
    signUp,
    signIn,
    signOut,
    uploadAvatar,
    retryProfile: () => setRetryCount((count) => count + 1),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
