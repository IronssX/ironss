import { SearchX } from 'lucide-react';
import { CategoryChips } from '@/components/CategoryChips';
import { VideoCard } from '@/components/VideoCard';
import { filterVideos } from '@/utils/videoFilters';
import { useLanguage } from '@/hooks/useLanguage';
import type { CategoryFilter, Video } from '@/types/video';

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
}: FeedPageProps) {
  const { t } = useLanguage();
  const visibleVideos = filterVideos(videos, query, category);
  const hasActiveFilters = query.trim() !== '' || category !== 'All';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">{description}</p>
      </div>

      <CategoryChips selected={category} onSelect={onCategoryChange} />

      <div className="flex items-center justify-between gap-4 text-sm text-gray-400">
        <p aria-live="polite">
          {t('feed.showingVideos', { shown: visibleVideos.length, total: videos.length })}
          {query.trim() && (
            <>
              {' '}<span className="text-gray-200">{t('feed.searchResult', { query: query.trim() })}</span>
            </>
          )}
        </p>
      </div>

      {visibleVideos.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleVideos.map((video) => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} onOpenChannel={onOpenChannel} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-surface-border bg-surface/50 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neon-500/15">
            <SearchX className="h-7 w-7 text-neon-300" />
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
              className="rounded-lg bg-neon-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neon-400"
            >
              {t('feed.clearFilters')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
