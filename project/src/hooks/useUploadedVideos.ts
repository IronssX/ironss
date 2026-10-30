import { useCallback, useEffect, useState } from 'react';
import { fetchVideos } from '@/services/videoService';
import type { Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import { translate } from '@/i18n';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

export function useUploadedVideos() {
  const { language } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    (async () => {
      try {
        const nextVideos = await fetchVideos();
        if (!isCurrent) return;
        setVideos(nextVideos);
        setHasError(false);
      } catch (error) {
        if (!isCurrent) return;
        logSupabaseFailure('videos', 'fetchVideos', error);
        setHasError(true);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [reloadCount]);

  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);

  return { videos, isLoading, error: hasError ? translate(language, 'videos.fetchFailed') : null, refresh };
}
