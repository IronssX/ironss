import { Play } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface LogoProps {
  onClick?: () => void;
}

export function Logo({ onClick }: LogoProps) {
  const { t } = useLanguage();
  const content = (
    <>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-neon-500 shadow-[0_0_18px_-2px_rgba(176,38,255,0.9)] transition-transform duration-300 group-hover:scale-105">
        <Play className="h-4 w-4 fill-white text-white" />
      </span>
      <span className="text-lg font-bold tracking-[0.18em] text-white">
        IRON<span className="text-neon-400">SS</span>
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-2.5">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('topbar.home')}
      className="group flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
    >
      {content}
    </button>
  );
}
