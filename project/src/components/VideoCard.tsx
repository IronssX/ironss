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
    <article className="video-card group flex w-full animate-fade-in flex-col rounded-[22px]">
      <button
        type="button"
        onClick={() => onSelect(video.id)}
        className="flex w-full flex-col rounded-[22px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
      >
        <div className="video-card-media relative aspect-video w-full overflow-hidden rounded-[22px] border border-white/[0.08] bg-surface-raised transition-all duration-300 group-hover:-translate-y-1 group-hover:border-neon-300/25 group-hover:shadow-[0_18px_42px_-20px_rgba(176,38,255,.65)]">
          <Thumbnail
            src={video.thumbnailUrl}
            alt={t('video.thumbnailAlt', { title: video.title })}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
          {video.duration && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 text-xs font-medium text-white">
              {video.duration}
            </span>
          )}
        </div>
      </button>

      <div className="mt-3.5 flex gap-3">
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
            <span className="line-clamp-2 text-[14px] font-semibold leading-[1.45] text-gray-100 transition-colors group-hover:text-neon-200">
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
          <p className="mt-1 text-[11px] text-gray-500">
            {formatViews(video.views, language)} &middot; {formatUploadDate(video.uploadedAt, Date.now(), language)}
          </p>
        </div>
      </div>
    </article>
  );
}
