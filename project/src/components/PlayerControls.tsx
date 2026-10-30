import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { formatPlaybackTime } from '@/utils/format';
import { useLanguage } from '@/hooks/useLanguage';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
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

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
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
  const isSilent = isMuted || volume === 0;
  const VolumeIcon = isSilent ? VolumeX : Volume2;

  const iconButtonClass =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-300 transition-colors hover:bg-surface-hover hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-300';

  return (
    <div className="flex items-center gap-2 border-t border-surface-border bg-surface px-3 py-2.5 sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? t('player.pause') : t('player.play')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neon-500 text-white transition-colors hover:bg-neon-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-300"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-white" />
        ) : (
          <Play className="h-4 w-4 translate-x-px fill-white" />
        )}
      </button>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onSeek(Number(event.target.value))}
        aria-label={t('player.seek')}
        aria-valuetext={t('player.seekValue', {
          current: formatPlaybackTime(currentTime),
          duration: formatPlaybackTime(duration),
        })}
        disabled={!duration}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-neon-500 disabled:cursor-not-allowed"
      />

      <span className="shrink-0 font-mono text-xs tabular-nums text-gray-300">
        {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
      </span>

      <div className="flex shrink-0 items-center gap-1">
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
          className="hidden w-20 cursor-pointer accent-neon-500 sm:block"
        />
      </div>

      {canFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? t('player.exitFullscreen') : t('player.enterFullscreen')}
          className={iconButtonClass}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
