import { AlertTriangle, Play, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PlayerControls } from '@/components/PlayerControls';
import { getPlaybackErrorMessage, logPlaybackError } from '@/utils/playbackErrors';
import { useLanguage } from '@/hooks/useLanguage';

interface VideoPlayerProps {
  src: string;
  title: string;
  onPlay?: () => void;
}

type FullscreenVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };

const canFullscreen =
  typeof document !== 'undefined' &&
  (document.fullscreenEnabled || 'webkitEnterFullscreen' in HTMLVideoElement.prototype);

export function VideoPlayer({ src, title, onPlay }: VideoPlayerProps) {
  const { language, t } = useLanguage();
  const playerRef = useRef<HTMLDivElement>(null);
  const [videoElement, setVideoElement] = useState<FullscreenVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const player = playerRef.current;
      setIsFullscreen(player !== null && document.fullscreenElement === player);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const hasError = errorCode !== null;
  const errorMessage = errorCode === null ? null : getPlaybackErrorMessage(errorCode, language);
  const showSpinner = isLoading && !hasError;
  const showPlayOverlay = !isPlaying && !isLoading && !hasError;

  const togglePlayback = () => {
    if (!videoElement || hasError) return;
    if (videoElement.paused) {
      // Interrupted plays reject with AbortError; real failures arrive through the video error event.
      videoElement.play().catch(() => undefined);
    } else {
      videoElement.pause();
    }
  };

  const seek = (time: number) => {
    if (!videoElement) return;
    videoElement.currentTime = time;
    setCurrentTime(time);
  };

  const changeVolume = (nextVolume: number) => {
    if (!videoElement) return;
    videoElement.volume = nextVolume;
    videoElement.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const toggleMute = () => {
    if (!videoElement) return;
    const nextMuted = !videoElement.muted;
    if (!nextMuted && videoElement.volume === 0) {
      videoElement.volume = 1;
      setVolume(1);
    }
    videoElement.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (playerRef.current?.requestFullscreen) {
      void playerRef.current.requestFullscreen();
      return;
    }
    videoElement?.webkitEnterFullscreen?.();
  };

  const retry = () => {
    if (!videoElement) return;
    setErrorCode(null);
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    videoElement.load();
  };

  const handleSourceError = () => {
    logPlaybackError(src, null, videoElement?.networkState ?? -1);
    setErrorCode(MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
    setIsLoading(false);
    setIsPlaying(false);
  };

  const handleDurationChange = (event: SyntheticEvent<HTMLVideoElement>) => {
    const videoDuration = event.currentTarget.duration;
    setDuration(Number.isFinite(videoDuration) ? videoDuration : 0);
  };

  return (
    <div
      ref={playerRef}
      className={`group overflow-hidden bg-black shadow-2xl ${
        isFullscreen ? 'flex h-full w-full flex-col' : 'rounded-2xl border border-surface-border'
      }`}
    >
      <div className={`relative w-full ${isFullscreen ? 'min-h-0 flex-1' : 'aspect-video'}`}>
        <video
          ref={setVideoElement}
          preload="metadata"
          playsInline
          aria-label={t('player.label', { title })}
          className="h-full w-full bg-black object-contain"
          onClick={togglePlayback}
          onPlay={() => {
            setIsPlaying(true);
            onPlay?.();
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onPlaying={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onLoadedMetadata={(event) => {
            setIsLoading(false);
            handleDurationChange(event);
          }}
          onSeeking={() => setIsLoading(true)}
          onSeeked={() => setIsLoading(false)}
          onWaiting={() => setIsLoading(true)}
          onStalled={() => setIsLoading(true)}
          onDurationChange={handleDurationChange}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onError={(event) => {
            const mediaError = event.currentTarget.error;
            logPlaybackError(src, mediaError, event.currentTarget.networkState);
            setErrorCode(mediaError?.code ?? 0);
            setIsLoading(false);
            setIsPlaying(false);
          }}
        >
          <source src={src} type="video/mp4" onError={handleSourceError} />
        </video>

        {showSpinner && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <LoadingSpinner />
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-6 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
              <AlertTriangle className="h-6 w-6 text-red-300" />
            </span>
            <div>
              <p className="text-base font-bold text-white">{t('player.failedTitle')}</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-gray-300">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-2 rounded-lg bg-neon-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neon-400"
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
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-500/90 shadow-[0_0_32px_-4px_rgba(176,38,255,1)] transition-transform duration-200 hover:scale-110">
              <Play className="h-7 w-7 translate-x-0.5 fill-white text-white" />
            </span>
          </button>
        )}
      </div>

      {!hasError && (
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
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
