import { useCallback, useEffect, useState } from 'react';
import { fetchVideos, VideoTypeSchemaMissingError } from '@/services/videoService';
import type { Video } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import { translate } from '@/i18n';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

export function useUploadedVideos() {
  const { language } = useLanguage();
  const [videos, setVideos] = useState<Video[]>([]);
  const [shorts, setShorts] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shortsSchemaMissing, setShortsSchemaMissing] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    (async () => {
      try {
        const [videosResult, shortsResult] = await Promise.allSettled([
          fetchVideos('standard'),
          fetchVideos('short'),
        ]);
        if (!isCurrent) return;

        if (videosResult.status === 'fulfilled') {
          setVideos(videosResult.value);
        } else {
          logSupabaseFailure('videos', 'fetchVideos', videosResult.reason);
          setVideos([]);
        }

        if (shortsResult.status === 'fulfilled') {
          setShorts(shortsResult.value);
          setShortsSchemaMissing(false);
        } else if (shortsResult.reason instanceof VideoTypeSchemaMissingError) {
          setShorts([]);
          setShortsSchemaMissing(true);
        } else {
          logSupabaseFailure('videos', 'fetchVideos', shortsResult.reason);
          setShorts([]);
          setShortsSchemaMissing(false);
        }

        setHasError(videosResult.status === 'rejected' ||
          (shortsResult.status === 'rejected' && !(shortsResult.reason instanceof VideoTypeSchemaMissingError)));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [reloadCount]);

  const refresh = useCallback(() => setReloadCount((count) => count + 1), []);

  useEffect(() => {
    window.addEventListener('ironss:videos-changed', refresh);
    return () => window.removeEventListener('ironss:videos-changed', refresh);
  }, [refresh]);

  return {
    videos,
    shorts,
    shortsSchemaMissing,
    isLoading,
    error: hasError ? translate(language, 'videos.fetchFailed') : null,
    refresh,
  };
}
