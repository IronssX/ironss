import { translate, type Language } from '@/i18n';

export function getPlaybackErrorMessage(code: number | undefined, language: Language = 'tr'): string {
  switch (code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return translate(language, 'playback.network');
    case MediaError.MEDIA_ERR_DECODE:
      return translate(language, 'playback.decode');
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return translate(language, 'playback.unsupported');
    default:
      return translate(language, 'playback.unknown');
  }
}

export function logPlaybackError(src: string, mediaError: MediaError | null, networkState: number): void {
  console.error('[IRONSS player] Video failed to load', {
    src,
    code: mediaError?.code ?? 'no media error (source element failed)',
    message: mediaError?.message || 'no message from browser',
    networkState,
  });
}
