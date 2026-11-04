import { AlertTriangle, Play, RotateCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, SyntheticEvent } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PlayerControls } from '@/components/PlayerControls';
import { getPlaybackErrorMessage, logPlaybackError } from '@/utils/playbackErrors';
import { useLanguage } from '@/hooks/useLanguage';
import type { VideoMimeType } from '@/types/video';

interface VideoPlayerProps {
  src: string;
  mimeType?: VideoMimeType;
  title: string;
  onPlay?: () => void;
  onRefreshSource?: () => Promise<string>;
}

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const canFullscreen =
  typeof document !== 'undefined' &&
  (document.fullscreenEnabled || (typeof HTMLVideoElement !== 'undefined' && 'webkitEnterFullscreen' in HTMLVideoElement.prototype));

export function VideoPlayer({ src, mimeType, title, onPlay, onRefreshSource }: VideoPlayerProps) {
  const { language, t } = useLanguage();
  const playerRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const shouldResumeRef = useRef(false);
  const refreshAttemptedRef = useRef(false);
  const refreshInProgressRef = useRef(false);
  const [videoElement, setVideoElement] = useState<FullscreenVideo | null>(null);
  const [refreshedSource, setRefreshedSource] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activeSource = refreshedSource ?? src;

  useEffect(() => {
    const handleFullscreenChange = () => {
      const player = playerRef.current;
      setIsFullscreen(player !== null && document.fullscreenElement === player);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    setRefreshedSource(null);
    setErrorCode(null);
    setIsLoading(true);
    refreshAttemptedRef.current = false;
    pendingSeekRef.current = null;
    shouldResumeRef.current = false;
  }, [src]);

  useEffect(() => {
    if (!refreshedSource || !videoElement) return;
    videoElement.load();
  }, [refreshedSource, videoElement]);

  const hasError = errorCode !== null;
  const errorMessage = errorCode === null ? null : getPlaybackErrorMessage(errorCode, language);
  const showSpinner = isLoading && !hasError;
  const showPlayOverlay = !isPlaying && !isLoading && !hasError;

  const togglePlayback = useCallback(() => {
    if (!videoElement || hasError) return;
    if (videoElement.paused) {
      videoElement.play().catch(() => undefined);
    } else {
      videoElement.pause();
    }
  }, [hasError, videoElement]);

  const seek = useCallback((time: number) => {
    if (!videoElement || !Number.isFinite(videoElement.duration)) return;
    const nextTime = Math.min(Math.max(time, 0), videoElement.duration);
    videoElement.currentTime = nextTime;
  }, [videoElement]);

  const changeVolume = useCallback((nextVolume: number) => {
    if (!videoElement) return;
    const boundedVolume = Math.min(1, Math.max(0, nextVolume));
    videoElement.volume = boundedVolume;
    videoElement.muted = boundedVolume === 0;
    setVolume(boundedVolume);
    setIsMuted(boundedVolume === 0);
  }, [videoElement]);

  const toggleMute = useCallback(() => {
    if (!videoElement) return;
    const nextMuted = !videoElement.muted;
    if (!nextMuted && videoElement.volume === 0) {
      videoElement.volume = 1;
      setVolume(1);
    }
    videoElement.muted = nextMuted;
    setIsMuted(nextMuted);
  }, [videoElement]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (playerRef.current?.requestFullscreen) {
      void playerRef.current.requestFullscreen();
      return;
    }
    videoElement?.webkitEnterFullscreen?.();
  }, [videoElement]);

  const refreshSource = useCallback(async (preservePlayback: boolean) => {
    if (!videoElement || !onRefreshSource || refreshInProgressRef.current) return false;
    refreshInProgressRef.current = true;
    setIsLoading(true);
    setErrorCode(null);
    pendingSeekRef.current = preservePlayback ? videoElement.currentTime : 0;
    shouldResumeRef.current = preservePlayback && isPlaying;
    try {
      const nextSource = await onRefreshSource();
      if (!nextSource) throw new Error('The refreshed video URL is empty.');
      refreshAttemptedRef.current = true;
      setRefreshedSource(nextSource);
      return true;
    } catch (error) {
      console.error('[IRONSS] Private video URL could not be refreshed.', error);
      setErrorCode(videoElement.error?.code ?? MediaError.MEDIA_ERR_NETWORK);
      setIsLoading(false);
      return false;
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [isPlaying, onRefreshSource, videoElement]);

  const retry = () => {
    if (!videoElement) return;
    if (onRefreshSource) {
      refreshAttemptedRef.current = false;
      void refreshSource(false);
      return;
    }
    setErrorCode(null);
    setIsLoading(true);
    setIsPlaying(false);
    videoElement.load();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLVideoElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target !== videoElement) return;
    switch (event.key.toLowerCase()) {
      case ' ':
      case 'k':
        event.preventDefault();
        togglePlayback();
        break;
      case 'arrowleft':
        event.preventDefault();
        seek((videoElement?.currentTime ?? 0) - 5);
        break;
      case 'arrowright':
        event.preventDefault();
        seek((videoElement?.currentTime ?? 0) + 5);
        break;
      case 'arrowup':
        event.preventDefault();
        changeVolume((videoElement?.volume ?? volume) + 0.05);
        break;
      case 'arrowdown':
        event.preventDefault();
        changeVolume((videoElement?.volume ?? volume) - 0.05);
        break;
      case 'm':
        event.preventDefault();
        toggleMute();
        break;
      case 'f':
        event.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  const handleMediaError = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget;
    const mediaError = element.error;
    logPlaybackError(activeSource, mediaError, element.networkState);
    setErrorCode(mediaError?.code ?? MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
    setIsLoading(false);
    setIsPlaying(false);
    if (
      onRefreshSource &&
      !refreshAttemptedRef.current &&
      (mediaError?.code === MediaError.MEDIA_ERR_NETWORK ||
        mediaError?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED)
    ) {
      void refreshSource(true);
    }
  };

  return (
    <div
      ref={playerRef}
      className={`group overflow-hidden bg-black shadow-[0_24px_80px_-32px_rgba(114,58,150,.7)] ${
        isFullscreen ? 'flex h-full w-full flex-col' : 'rounded-2xl border border-white/10'
      }`}
    >
      <div className={`relative w-full ${isFullscreen ? 'min-h-0 flex-1' : 'aspect-video'}`}>
        <video
          ref={setVideoElement}
          preload="metadata"
          playsInline
          tabIndex={0}
          aria-label={t('player.label', { title })}
          className="h-full w-full bg-black object-contain focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-neon-300"
          onKeyDown={handleKeyDown}
          onClick={togglePlayback}
          onPlay={() => {
            setIsPlaying(true);
            onPlay?.();
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onLoadStart={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onLoadedMetadata={(event) => {
            setIsLoading(false);
            if (pendingSeekRef.current !== null) {
              const time = Math.min(pendingSeekRef.current, Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0);
              event.currentTarget.currentTime = time;
              pendingSeekRef.current = null;
              if (shouldResumeRef.current) {
                shouldResumeRef.current = false;
                event.currentTarget.play().catch(() => undefined);
              }
            }
          }}
          onSeeking={() => setIsLoading(true)}
          onSeeked={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onStalled={() => setIsLoading(true)}
          onError={handleMediaError}
        >
          <source src={activeSource} type={mimeType} />
        </video>

        {showSpinner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px]" aria-live="polite">
            <LoadingSpinner />
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center backdrop-blur-sm"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-300/20 bg-red-500/15">
              <AlertTriangle className="h-6 w-6 text-red-300" />
            </span>
            <div>
              <p className="text-base font-bold text-white">{t('player.failedTitle')}</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-gray-300">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-neon-500 px-5 text-sm font-semibold text-white shadow-[0_0_24px_-8px_rgba(176,38,255,.9)] transition hover:bg-neon-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300"
            >
              <RotateCw className="h-4 w-4" />
              {t('player.retry')}
            </button>
          </div>
        )}

        {showPlayOverlay && (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={t('player.playTitle', { title })}
            className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/25 via-transparent to-black/10 transition-colors hover:from-black/35"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-neon-500/90 shadow-[0_0_36px_-4px_rgba(176,38,255,1)] transition-transform duration-200 hover:scale-110 motion-reduce:transition-none">
              <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
            </span>
          </button>
        )}
      </div>

      {!hasError && (
        <PlayerControls
          videoElement={videoElement}
          isPlaying={isPlaying}
          volume={volume}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          canFullscreen={canFullscreen}
          onTogglePlay={togglePlayback}
          onSeek={seek}
          onVolumeChange={changeVolume}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
        />
      )}
    </div>
  );
}
