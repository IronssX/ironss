import { ArrowLeft, ArrowRight, Clapperboard, FileVideo } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { Page } from '@/types/navigation';

interface UploadChoicePageProps {
  onNavigate: (page: Page) => void;
}

export function UploadChoicePage({ onNavigate }: UploadChoicePageProps) {
  const { language, t } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in">
      <button
        type="button"
        onClick={() => onNavigate('home')}
        className="ghost-button h-10 px-3 text-xs"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {t('watch.backHome')}
      </button>

      <header className="mb-8 mt-8 text-center sm:mb-10 sm:mt-12">
        <p className="eyebrow">{isEnglish ? 'CREATE ON IRONSS' : 'IRONSS’TA ÜRET'}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
          {t('upload.chooseTypeTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-400">
          {t('upload.chooseTypeDescription')}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
        <button
          type="button"
          onClick={() => onNavigate('shorts-upload')}
          className="upload-choice-card group relative flex min-h-64 flex-col items-start overflow-hidden rounded-[26px] border border-neon-300/15 bg-gradient-to-br from-neon-500/[0.12] via-[#17141e] to-[#121116] p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-neon-300/40 hover:shadow-[0_24px_70px_-38px_rgba(190,123,255,0.65)] active:scale-[.99] sm:min-h-72 sm:p-8"
        >
          <span className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-neon-300/10 transition-transform duration-500 group-hover:scale-110" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-300/20 bg-neon-300/[0.1] text-neon-200 shadow-[0_8px_32px_-18px_rgba(205,163,245,0.9)]">
            <Clapperboard aria-hidden="true" className="h-7 w-7" />
          </span>
          <span className="relative mt-6 block text-xl font-semibold text-white">
            {t('upload.clipsOptionTitle')}
          </span>
          <span className="relative mt-2 block max-w-sm text-sm leading-6 text-gray-400">
            {t('upload.clipsOptionDescription')}
          </span>
          <span className="relative mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-neon-200 transition-colors group-hover:text-white">
            {t('upload.chooseTypeAction')}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('upload')}
          className="upload-choice-card group relative flex min-h-64 flex-col items-start overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#15131b] p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-neon-300/35 hover:bg-[#1b1722] hover:shadow-[0_24px_70px_-42px_rgba(190,123,255,0.45)] active:scale-[.99] sm:min-h-72 sm:p-8"
        >
          <span className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-neon-300/[0.07] transition-transform duration-500 group-hover:scale-110" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.1] bg-white/[0.04] text-gray-200 transition-colors group-hover:border-neon-300/20 group-hover:bg-neon-300/[0.08] group-hover:text-neon-200">
            <FileVideo aria-hidden="true" className="h-7 w-7" />
          </span>
          <span className="relative mt-6 block text-xl font-semibold text-white">
            {t('upload.standardOptionTitle')}
          </span>
          <span className="relative mt-2 block max-w-sm text-sm leading-6 text-gray-400">
            {t('upload.standardOptionDescription')}
          </span>
          <span className="relative mt-auto flex items-center gap-2 pt-6 text-sm font-semibold text-gray-300 transition-colors group-hover:text-neon-200">
            {t('upload.chooseTypeAction')}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        {t('upload.chooseTypeNote')}
      </p>
    </div>
  );
}
