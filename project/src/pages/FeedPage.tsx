import { ArrowDownRight, ArrowRight, SearchX, Sparkles } from 'lucide-react';
import { CategoryChips } from '@/components/CategoryChips';
import { VideoCard } from '@/components/VideoCard';
import { filterVideos } from '@/utils/videoFilters';
import { useLanguage } from '@/hooks/useLanguage';
import type { CategoryFilter, Video } from '@/types/video';
import type { Page } from '@/types/navigation';
import { useAuth } from '@/hooks/useAuth';

interface FeedPageProps {
  title: string;
  description: string;
  videos: Video[];
  query: string;
  category: CategoryFilter;
  onCategoryChange: (category: CategoryFilter) => void;
  onResetFilters: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onNavigate: (page: Page) => void;
  isHome: boolean;
}

export function FeedPage({
  title,
  description,
  videos,
  query,
  category,
  onCategoryChange,
  onResetFilters,
  onSelectVideo,
  onOpenChannel,
  onNavigate,
  isHome,
}: FeedPageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const visibleVideos = filterVideos(videos, query, category);
  const hasActiveFilters = query.trim() !== '' || category !== 'All';

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 sm:gap-8">
      {isHome && (
        <section className="home-hero relative isolate overflow-hidden rounded-[26px] border border-white/[0.08] px-6 py-7 sm:px-9 sm:py-9 lg:px-12 lg:py-11">
          <div className="hero-grain pointer-events-none absolute inset-0 -z-10" />
          <div className="hero-orbit pointer-events-none absolute -right-20 -top-32 -z-10 h-[26rem] w-[26rem] rounded-full border border-neon-300/10 sm:right-0" />
          <div className="hero-orbit pointer-events-none absolute -right-8 -top-20 -z-10 h-[22rem] w-[22rem] rounded-full border border-neon-300/[0.07]" />
          <div className="grid items-center gap-8 sm:grid-cols-[minmax(0,1.15fr)_minmax(220px,.85fr)]">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-neon-300/15 bg-neon-300/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-neon-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t('feed.heroEyebrow')}
              </span>
              <h1 className="mt-5 max-w-xl text-[2.4rem] font-semibold leading-[1.06] tracking-[-0.055em] text-white sm:text-5xl lg:text-[3.55rem]">
                {t('feed.heroTitle')}
                <span className="block bg-gradient-to-r from-neon-200 via-[#c397ff] to-[#9b7cff] bg-clip-text text-transparent">{t('feed.heroAccent')}</span>
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-gray-400 sm:text-[15px]">{t('feed.heroDescription')}</p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button type="button" onClick={() => onNavigate('explore')} className="primary-button h-11 px-5">
                  {t('feed.exploreAction')}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => onNavigate(user ? 'upload-choice' : 'login')} className="ghost-button h-11 px-4">
                  {user ? t('topbar.upload') : t('topbar.signIn')}
                  <ArrowDownRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative hidden min-h-[220px] items-center justify-center sm:flex" aria-hidden="true">
              <div className="hero-emblem relative flex h-44 w-44 items-center justify-center rounded-[38px] border border-white/10">
                <div className="absolute inset-3 rounded-[30px] border border-neon-200/10" />
                <div className="absolute h-28 w-28 rounded-full bg-neon-500/15 blur-2xl" />
                <svg viewBox="0 0 80 80" className="relative h-24 w-24 text-neon-200">
                  <path d="M19 18h42v10H30v10h31v24H19V52h31v-5H19V18Z" fill="currentColor" />
                  <path d="M19 18v44" stroke="white" strokeOpacity=".34" strokeWidth="2" />
                </svg>
                <span className="absolute -right-4 top-8 rounded-xl border border-white/10 bg-[#24212d]/90 px-3 py-2 text-[10px] font-bold tracking-[.18em] text-gray-300 shadow-xl">IRONSS / 01</span>
                <span className="absolute -bottom-3 left-1 rounded-xl border border-white/10 bg-[#24212d]/90 px-3 py-2 text-[10px] font-medium text-neon-200 shadow-xl">{t('feed.heroNote')}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-1">
        <p className="eyebrow">{isHome ? t('feed.latestLabel') : t('feed.exploreLabel')}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-[28px]">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <CategoryChips
        selected={category}
        availableCategories={[...new Set(videos.flatMap((video) => video.category ? [video.category] : []))]}
        onSelect={onCategoryChange}
      />

      <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
        <p aria-live="polite" className="text-xs font-medium text-gray-500">
          {t('feed.showingVideos', { shown: visibleVideos.length, total: videos.length })}
          {query.trim() && (
            <>
              {' '}<span className="text-gray-200">{t('feed.searchResult', { query: query.trim() })}</span>
            </>
          )}
        </p>
      </div>

      {visibleVideos.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleVideos.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} onOpenChannel={onOpenChannel} />
          ))}
        </div>
      ) : (
        <div className="empty-state flex flex-col items-center gap-4 rounded-[26px] border border-dashed border-white/10 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-neon-300/10 bg-neon-300/[0.06]">
            <SearchX className="h-6 w-6 text-neon-200" />
          </span>
          <div>
            <p className="text-lg font-bold text-white">{t('feed.noVideoFound')}</p>
            <p className="mt-1 text-sm text-gray-400">
              {t('feed.tryAnother')}
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="primary-button h-10 px-4"
            >
              {t('feed.clearFilters')}
            </button>
          )}
        </div>
      )}

      {isHome && (
        <footer className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-white/[0.08] pt-5 text-xs text-gray-500 sm:flex-row">
          <span>© IRONSS</span>
          <nav aria-label={t('feed.legalNavigation')} className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <a
              href="/privacy-policy"
              className="rounded-md transition-colors hover:text-neon-200"
            >
              {t('feed.privacyPolicy')}
            </a>
            <a
              href="/terms"
              className="rounded-md transition-colors hover:text-neon-200"
            >
              {t('feed.termsOfUse')}
            </a>
          </nav>
        </footer>
      )}
    </div>
  );
}
