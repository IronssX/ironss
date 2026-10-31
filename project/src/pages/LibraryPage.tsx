import { useState } from 'react';
import { Bookmark, Clock3, Heart } from 'lucide-react';
import { VideoCard } from '@/components/VideoCard';
import { useLanguage } from '@/hooks/useLanguage';
import type { Video } from '@/types/video';
import { getLikedVideoIds } from '@/utils/likeStorage';
import { getSavedVideoIds } from '@/utils/videoLocalPreferences';

interface LibraryPageProps {
  videos: Video[];
  onSelectVideo: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
}

type LibrarySection = 'liked' | 'history' | 'watchLater';

const SECTIONS: { id: LibrarySection; icon: typeof Heart; labelKey: 'library.liked' | 'library.history' | 'library.watchLater' }[] = [
  { id: 'liked', icon: Heart, labelKey: 'library.liked' },
  { id: 'history', icon: Clock3, labelKey: 'library.history' },
  { id: 'watchLater', icon: Bookmark, labelKey: 'library.watchLater' },
];

export function LibraryPage({ videos, onSelectVideo, onOpenChannel }: LibraryPageProps) {
  const { t } = useLanguage();
  const [section, setSection] = useState<LibrarySection>('liked');
  const likedIds = getLikedVideoIds();
  const likedVideos = videos.filter((video) => likedIds.includes(video.id));
  const savedIds = getSavedVideoIds();
  const savedVideos = videos.filter((video) => savedIds.includes(video.id));

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-7 animate-fade-in">
      <header>
        <p className="eyebrow">{t('library.eyebrow')}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{t('placeholder.libraryTitle')}</h1>
        <p className="mt-2 text-sm text-gray-500">{t('library.description')}</p>
      </header>

      <nav aria-label={t('placeholder.libraryTitle')} className="flex flex-wrap gap-2 border-b border-white/[0.07] pb-4">
        {SECTIONS.map(({ id, icon: Icon, labelKey }) => {
          const isActive = section === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-colors ${
                isActive
                  ? 'border-neon-300/20 bg-neon-300/[0.08] text-neon-200'
                  : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:bg-white/[0.05] hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          );
        })}
      </nav>

      {section === 'liked' ? (
        likedVideos.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {likedVideos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} onOpenChannel={onOpenChannel} />
            ))}
          </div>
        ) : (
          <section className="empty-state flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 px-6 text-center">
            <Heart className="h-7 w-7 text-neon-200" />
            <h2 className="mt-4 text-lg font-semibold text-white">{t('library.likedEmptyTitle')}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{t('library.likedEmptyDescription')}</p>
          </section>
        )
      ) : section === 'watchLater' ? (
        savedVideos.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {savedVideos.map((video) => (
              <VideoCard key={video.id} video={video} onSelect={onSelectVideo} onOpenChannel={onOpenChannel} />
            ))}
          </div>
        ) : (
          <section className="empty-state flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 px-6 text-center">
            <Bookmark className="h-7 w-7 text-neon-200" />
            <h2 className="mt-4 text-lg font-semibold text-white">{t('library.watchLater')}</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{t('library.savedEmptyDescription')}</p>
          </section>
        )
      ) : (
        <section className="empty-state flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 px-6 text-center">
          <Clock3 className="h-7 w-7 text-neon-200" />
          <h2 className="mt-4 text-lg font-semibold text-white">
            {t('library.history')}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{t('library.unavailable')}</p>
        </section>
      )}
    </div>
  );
}
