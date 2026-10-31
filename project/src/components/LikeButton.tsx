import { ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { formatExactCount } from '@/utils/format';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/hooks/useSettings';

interface LikeButtonProps {
  baseLikes: number;
  isLiked: boolean;
  onToggle: () => void;
}

export function LikeButton({ baseLikes, isLiked, onToggle }: LikeButtonProps) {
  const { language, t } = useLanguage();
  const { reduceMotion } = useSettings();
  const [animationKey, setAnimationKey] = useState(0);
  const likeCount = baseLikes + (isLiked ? 1 : 0);

  const handleClick = () => {
    onToggle();
    setAnimationKey((current) => current + 1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isLiked}
      aria-label={`${isLiked ? t('like.liked') : t('like.like')}, ${t('like.countLabel')}: ${formatExactCount(likeCount, language)}`}
      className={`flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neon-300 ${
        isLiked
          ? 'bg-neon-500 text-white shadow-[0_0_20px_-4px_rgba(176,38,255,0.9)] hover:bg-neon-400'
          : 'border border-neon-500/50 bg-surface-raised text-neon-300 hover:border-neon-400 hover:bg-neon-500/10'
      }`}
    >
      <ThumbsUp
        key={animationKey}
        className={`h-4 w-4 transition-transform duration-200 ${isLiked ? 'fill-white' : ''} ${!reduceMotion ? 'animate-heart-pop' : ''}`}
      />
      <span>{isLiked ? t('like.liked') : t('like.like')}</span>
      <span key={likeCount} className={`tabular-nums ${!reduceMotion ? 'animate-like-count' : ''}`} aria-live="polite">
        {formatExactCount(likeCount, language)}
      </span>
    </button>
  );
}
