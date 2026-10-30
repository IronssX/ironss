import { ArrowLeft, Eye } from 'lucide-react';
import { useRef } from 'react';
import { CommentsSection } from '@/components/CommentsSection';
import { LikeButton } from '@/components/LikeButton';
import { Thumbnail } from '@/components/Thumbnail';
import { VideoPlayer } from '@/components/VideoPlayer';
import { getInitials, formatUploadDate, formatViews } from '@/utils/format';
import { recordVideoView } from '@/services/videoService';
import type { Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';

interface WatchPageProps {
  video: Video;
  relatedVideos: Video[];
  onBack: () => void;
  onSelectVideo: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onViewRecorded: (videoId: string, views: number) => void;
}

export function WatchPage({ video, relatedVideos, onBack, onSelectVideo, onOpenChannel, onViewRecorded }: WatchPageProps) {
  const { language, t } = useLanguage();
  const recordedVideoIdRef = useRef<string | null>(null);
  const handlePlay = () => {
    if (video.source !== 'uploaded' || recordedVideoIdRef.current === video.id) return;
    const videoId = video.id;
    recordedVideoIdRef.current = videoId;
    recordVideoView(videoId)
      .then((views) => onViewRecorded(videoId, views))
      .catch((error: unknown) => {
        recordedVideoIdRef.current = null;
        console.warn('[IRONSS] View could not be recorded.', error);
      });
  };
  const channelId = video.ownerId;
  const openChannel = () => {
    if (channelId) onOpenChannel(channelId);
  };
  const creatorContent = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neon-500 to-neon-700 text-sm font-bold text-white">
        {getInitials(video.creator)}
      </span>
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-bold text-gray-100">{video.creator}</p>
        <p className="text-xs text-gray-500">{video.source === 'uploaded' ? t('watch.memberUpload') : t('watch.sampleChannel')}</p>
      </div>
    </>
  );
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
      <div className="flex min-w-0 flex-col gap-5">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-2 rounded-lg text-sm font-medium text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('watch.backHome')}
        </button>

        <VideoPlayer key={video.id} src={video.videoUrl} title={video.title} onPlay={handlePlay} />

        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-md border border-neon-500/40 bg-neon-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neon-300">
              {video.source === 'uploaded' ? t('watch.uploaded') : t('watch.sample')}
            </span>
            <h1 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl">{video.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
              <Eye className="h-4 w-4" />
              {formatViews(video.views, language)} &middot; {formatUploadDate(video.uploadedAt, Date.now(), language)}
              {video.category && <> &middot; {video.category}</>}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-y border-surface-border py-4">
            {channelId ? (
              <button
                type="button"
                onClick={openChannel}
                aria-label={t('watch.openChannel', { name: video.creator })}
                className="flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors hover:text-neon-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
              >
                {creatorContent}
              </button>
            ) : (
              <div className="flex min-w-0 items-center gap-3">{creatorContent}</div>
            )}
            <LikeButton key={video.id} videoId={video.id} baseLikes={video.likes} />
          </div>

          <p className="rounded-xl bg-surface p-4 text-sm leading-relaxed text-gray-300">
            {video.description}
          </p>

          <CommentsSection key={video.id} videoId={video.id} />
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">{t('watch.upNext')}</h2>
        {relatedVideos.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {relatedVideos.map((related) => (
              <li key={related.id}>
                <button
                  type="button"
                  onClick={() => onSelectVideo(related.id)}
                  className="group flex w-full gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
                >
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg border border-surface-border">
                    <Thumbnail
                      src={related.thumbnailUrl}
                      alt={t('watch.thumbnailAlt', { title: related.title })}
                      className="h-full w-full transition-transform duration-500 group-hover:scale-105"
                    />
                      {related.duration && (
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[11px] font-medium text-white">
                          {related.duration}
                        </span>
                      )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-medium leading-snug text-gray-100 transition-colors group-hover:text-neon-300">
                      {related.title}
                    </h3>
                    <p className="mt-1 truncate text-xs text-gray-400">{related.creator}</p>
                    <p className="text-xs text-gray-500">{formatViews(related.views, language)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">{t('watch.noRelated')}</p>
        )}
      </aside>
    </div>
  );
}
