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
    if (recordedVideoIdRef.current === video.id) return;
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
        <p className="text-xs text-gray-500">{t('watch.memberUpload')}</p>
      </div>
    </>
  );
  return (
    <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
      <div className="flex min-w-0 flex-col gap-5">
        <button
          type="button"
          onClick={onBack}
          className="ghost-button h-10 w-fit px-3 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('watch.backHome')}
        </button>

        <VideoPlayer key={video.id} src={video.videoUrl} title={video.title} onPlay={handlePlay} />

        <div className="flex flex-col gap-4">
          <div>
            <span className="inline-block rounded-full border border-neon-300/15 bg-neon-300/[0.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.17em] text-neon-200">
              {t('watch.uploaded')}
            </span>
            <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[30px]">{video.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-gray-400">
              <Eye className="h-4 w-4" />
              {formatViews(video.views, language)} &middot; {formatUploadDate(video.uploadedAt, Date.now(), language)}
              {video.category && <> &middot; {video.category}</>}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-y border-white/[0.07] py-4">
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

          <p className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 text-sm leading-relaxed text-gray-300">
            {video.description}
          </p>

          <CommentsSection key={video.id} videoId={video.id} />
        </div>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <h2 className="eyebrow">{t('watch.upNext')}</h2>
        {relatedVideos.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {relatedVideos.map((related) => (
              <li key={related.id}>
                <button
                  type="button"
                  onClick={() => onSelectVideo(related.id)}
                  className="group flex w-full gap-3 rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-400"
                >
                  <div className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-xl border border-white/[0.08]">
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
                    <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-100 transition-colors group-hover:text-neon-200">
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
