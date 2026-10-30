import { useLanguage } from '@/hooks/useLanguage';

interface LogoProps {
  onClick?: () => void;
}

export function Logo({ onClick }: LogoProps) {
  const { t } = useLanguage();
  const content = (
    <>
      <span className="brand-mark flex h-10 w-10 items-center justify-center rounded-[14px] transition-transform duration-300 group-hover:scale-105">
        <svg aria-hidden="true" viewBox="0 0 40 40" className="h-7 w-7">
          <path d="M10 9h20v5H15v5h15v12H10v-5h15v-2H10V9Z" fill="currentColor" />
          <path d="M10 9v22" stroke="white" strokeOpacity=".36" strokeWidth="1.5" />
        </svg>
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[17px] font-extrabold tracking-[0.2em] text-white">
          IRON<span className="text-neon-300">SS</span>
        </span>
        <span className="mt-1 text-[8px] font-semibold tracking-[0.28em] text-gray-500">VIDEO CULTURE</span>
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('topbar.home')}
      className="group flex items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
    >
      {content}
    </button>
  );
}
