import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/profile';

export interface RegisterValues {
  username: string;
  email: string;
  password: string;
}

export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  avatarUrl: string | null;
  isLoading: boolean;
  profileError: string | null;
  notice: string | null;
  dismissNotice: () => void;
  signUp: (values: RegisterValues) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  uploadAvatar: (file: File) => Promise<string | null>;
  retryProfile: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
