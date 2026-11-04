import { memo, useEffect, useState } from 'react';
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { ChangeEvent, CSSProperties } from 'react';
import { formatPlaybackTime } from '@/utils/format';
import { useLanguage } from '@/hooks/useLanguage';

interface PlayerControlsProps {
  videoElement: HTMLVideoElement | null;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  canFullscreen: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export const PlayerControls = memo(function PlayerControls({
  videoElement,
  isPlaying,
  volume,
  isMuted,
  isFullscreen,
  canFullscreen,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
}: PlayerControlsProps) {
  const { t } = useLanguage();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekStart, setSeekStart] = useState(0);
  const isSilent = isMuted || volume === 0;
  const VolumeIcon = isSilent ? VolumeX : Volume2;

  useEffect(() => {
    if (!videoElement) {
      setCurrentTime(0);
      setDuration(0);
      setSeekStart(0);
      return;
    }

    let lastTimeUpdate = 0;
    const updateTime = (force = false) => {
      const now = performance.now();
      if (!force && now - lastTimeUpdate < 200 && !videoElement.paused) return;
      lastTimeUpdate = now;
      setCurrentTime(videoElement.currentTime);
    };
    const updateDuration = () => {
      const nextDuration = videoElement.duration;
      if (Number.isFinite(nextDuration)) {
        setSeekStart(0);
        setDuration(Math.max(nextDuration, 0));
      } else if (Number.isNaN(nextDuration) || videoElement.seekable.length === 0) {
        setSeekStart(0);
        setDuration(0);
      } else {
        setSeekStart(videoElement.seekable.start(0));
        setDuration(videoElement.seekable.end(videoElement.seekable.length - 1));
      }
      updateTime();
    };
    const handleTimeUpdate = () => {
      if (!Number.isFinite(videoElement.duration)) updateDuration();
      else updateTime();
    };

    updateDuration();
    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('durationchange', updateDuration);
    videoElement.addEventListener('loadedmetadata', updateDuration);
    videoElement.addEventListener('progress', updateDuration);
    const updateTimeImmediately = () => updateTime(true);
    videoElement.addEventListener('seeking', updateTimeImmediately);
    videoElement.addEventListener('seeked', updateTimeImmediately);
    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('durationchange', updateDuration);
      videoElement.removeEventListener('loadedmetadata', updateDuration);
      videoElement.removeEventListener('progress', updateDuration);
      videoElement.removeEventListener('seeking', updateTimeImmediately);
      videoElement.removeEventListener('seeked', updateTimeImmediately);
    };
  }, [videoElement]);

  const iconButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-300';

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-white/10 bg-[#111018]/95 px-2.5 py-2.5 backdrop-blur-xl sm:flex-nowrap sm:gap-2 sm:px-3">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? t('player.pause') : t('player.play')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neon-500 text-white shadow-[0_0_18px_-8px_rgba(176,38,255,.9)] transition-colors hover:bg-neon-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-300"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 translate-x-px fill-white" />
        )}
      </button>

      <input
        type="range"
        min={seekStart}
        max={duration || 0}
        step={0.1}
        value={Math.min(Math.max(currentTime, seekStart), duration || 0)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onSeek(Number(event.target.value))}
        aria-label={t('player.seek')}
        aria-valuetext={t('player.seekValue', {
          current: formatPlaybackTime(currentTime),
          duration: formatPlaybackTime(duration),
        })}
        disabled={duration <= seekStart}
        className="order-last h-1.5 min-w-0 basis-full cursor-pointer accent-neon-500 disabled:cursor-not-allowed sm:order-none sm:flex-1"
      />

      <span className="shrink-0 font-mono text-[11px] tabular-nums text-gray-300 sm:text-xs">
        {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
      </span>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-0.5 rounded-xl border border-white/[0.07] bg-white/[0.035] px-1 sm:ml-0 sm:gap-1 sm:px-1.5">
        <button type="button" onClick={onToggleMute} aria-label={isSilent ? t('player.unmute') : t('player.mute')} className={iconButtonClass}>
          <VolumeIcon className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onVolumeChange(Number(event.target.value))}
          aria-label={t('player.volume')}
          aria-valuetext={`${Math.round(volume * 100)}%`}
          style={{ '--volume-level': `${isMuted ? 0 : volume * 100}%` } as CSSProperties}
          className="volume-range w-9 cursor-pointer sm:w-14"
        />
      </div>

      {canFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? t('player.exitFullscreen') : t('player.enterFullscreen')}
          className={`${iconButtonClass} ml-auto sm:ml-0`}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
});
