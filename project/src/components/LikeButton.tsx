import { ThumbsUp } from 'lucide-react';
import { useVideoLike } from '@/hooks/useVideoLike';
import { formatExactCount } from '@/utils/format';
import { useLanguage } from '@/hooks/useLanguage';

interface LikeButtonProps {
  videoId: string;
  baseLikes: number;
}

export function LikeButton({ videoId, baseLikes }: LikeButtonProps) {
  const { language, t } = useLanguage();
  const { isLiked, toggleLike } = useVideoLike(videoId);
  const likeCount = baseLikes + (isLiked ? 1 : 0);

  return (
    <button
      type="button"
      onClick={toggleLike}
      aria-pressed={isLiked}
      className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300 ${
        isLiked
          ? 'bg-neon-500 text-white shadow-[0_0_20px_-4px_rgba(176,38,255,0.9)] hover:bg-neon-400'
          : 'border border-neon-500/50 bg-surface-raised text-neon-300 hover:border-neon-400 hover:bg-neon-500/10'
      }`}
    >
      <ThumbsUp
        className={`h-4 w-4 transition-transform duration-200 ${isLiked ? 'scale-110 fill-white' : ''}`}
      />
      <span>{isLiked ? t('like.liked') : t('like.like')}</span>
      <span className="tabular-nums" aria-live="polite">
        {formatExactCount(likeCount, language)}
      </span>
    </button>
  );
}
