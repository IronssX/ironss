import type { CoverTheme } from '@/types/profile';

export const PROFILE_COVER_THEMES: { id: CoverTheme; className: string }[] = [
  {
    id: 'purple-neon',
    className: 'bg-[radial-gradient(ellipse_at_78%_10%,rgba(196,117,255,.55),transparent_38%),linear-gradient(115deg,#171020,#35104e_52%,#0d0b12)]',
  },
  {
    id: 'black',
    className: 'bg-[radial-gradient(ellipse_at_78%_10%,rgba(255,255,255,.12),transparent_35%),linear-gradient(115deg,#050506,#15151a_56%,#08080a)]',
  },
  {
    id: 'minimal',
    className: 'bg-[radial-gradient(ellipse_at_85%_12%,rgba(191,169,220,.22),transparent_35%),linear-gradient(115deg,#16141b,#28232f_55%,#111015)]',
  },
  {
    id: 'gaming',
    className: 'bg-[radial-gradient(ellipse_at_80%_10%,rgba(173,66,255,.38),transparent_35%),linear-gradient(125deg,#090b18,#1d1644_48%,#10091c)]',
  },
];

export function getProfileCoverClass(theme: CoverTheme): string {
  return PROFILE_COVER_THEMES.find((cover) => cover.id === theme)?.className
    ?? PROFILE_COVER_THEMES[0].className;
}
