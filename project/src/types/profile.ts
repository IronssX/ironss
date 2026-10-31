export interface Profile {
  id: string;
  username: string;
  avatarPath: string | null;
  channelDescription: string | null;
  coverImagePath: string | null;
  coverTheme: CoverTheme;
}

export type CoverTheme = 'purple-neon' | 'black' | 'minimal' | 'gaming';
