import { useState } from 'react';
import { Clapperboard } from 'lucide-react';

interface ThumbnailProps {
  src: string;
  alt: string;
  className?: string;
}

export function Thumbnail({ src, alt, className = '' }: ThumbnailProps) {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gradient-to-br from-neon-700 via-surface-raised to-background ${className}`}
      >
        <Clapperboard className="h-10 w-10 text-neon-300/70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setHasFailed(true)}
      className={`bg-surface-raised object-cover ${className}`}
    />
  );
}
