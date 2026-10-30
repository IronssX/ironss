import { formatUploadDate, formatViews } from '@/utils/format';
import { Thumbnail } from '@/components/Thumbnail';
import { useLanguage } from '@/hooks/useLanguage';
import type { Video } from '@/types/video';

interface VideoCardProps {
  video: Video;
  onSelect: (videoId: string) => void;
  onOpenChannel?: (channelId: string) => void;
}

export function VideoCard({ video, onSelect, onOpenChannel }: VideoCardProps) {
  const { language, t } = useLanguage();
  const channelId = video.ownerId;
  const canOpenChannel = Boolean(onOpenChannel && channelId);
  const openChannel = () => {
    if (onOpenChannel && channelId) onOpenChannel(channelId);
  };

  const avatar = (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-500 to-neon-700 text-xs font-bold text-white">
      {video.creator.charAt(0)}
    </span>
  );

  return (
    <div className="group flex w-full animate-fade-in flex-col rounded-xl">
      <button
        type="button"
        onClick={() => onSelect(video.id)}
        className="flex w-full flex-col text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400 rounded-xl"
      >
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-surface-raised transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-neon-500/60 group-hover:shadow-[0_12px_32px_-12px_rgba(176,38,255,0.6)]">
          <Thumbnail
            src={video.thumbnailUrl}
            alt={t('video.thumbnailAlt', { title: video.title })}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          {video.source !== 'uploaded' && (
            <span className="absolute left-2 top-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-300">
              {t('video.sampleBadge')}
            </span>
          )}
          {video.duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
              {video.duration}
            </span>
          )}
        </div>
      </button>

      <div className="mt-3 flex gap-3">
        {canOpenChannel ? (
          <button
            type="button"
            onClick={openChannel}
            aria-label={t('watch.openChannel', { name: video.creator })}
            className="rounded-full transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
          >
            {avatar}
          </button>
        ) : (
          avatar
        )}
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => onSelect(video.id)}
            className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400 rounded"
          >
            <span className="line-clamp-2 text-sm font-medium leading-snug text-gray-100 transition-colors group-hover:text-neon-300">
              {video.title}
            </span>
          </button>
          {canOpenChannel ? (
            <button
              type="button"
              onClick={openChannel}
              className="mt-1 block max-w-full truncate text-left text-xs text-gray-400 transition-colors hover:text-neon-300"
            >
              {video.creator}
            </button>
          ) : (
            <p className="mt-1 truncate text-xs text-gray-400">{video.creator}</p>
          )}
          <p className="text-xs text-gray-500">
            {formatViews(video.views, language)} &middot; {formatUploadDate(video.uploadedAt, Date.now(), language)}
          </p>
        </div>
      </div>
    </div>
  );
}
