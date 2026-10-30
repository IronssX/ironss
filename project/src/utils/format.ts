import type { Language } from '@/i18n';

function localeFor(language: Language): string {
  return language === 'tr' ? 'tr-TR' : 'en-US';
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
];

export function formatViews(views: number, language: Language = 'tr'): string {
  const formatted = new Intl.NumberFormat(localeFor(language), {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(views);
  return language === 'tr' ? `${formatted} görüntüleme` : `${formatted} views`;
}

export function formatExactCount(value: number, language: Language = 'tr'): string {
  return new Intl.NumberFormat(localeFor(language)).format(value);
}

export function formatUploadDate(isoDate: string, now: number = Date.now(), language: Language = 'tr'): string {
  const diffSeconds = Math.round((new Date(isoDate).getTime() - now) / 1000);
  const relativeTime = new Intl.RelativeTimeFormat(localeFor(language), { numeric: 'auto' });

  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= unitSeconds) {
      return relativeTime.format(Math.round(diffSeconds / unitSeconds), unit);
    }
  }

  return relativeTime.format(0, 'day');
}

export function formatTimeAgo(isoDate: string, now: number = Date.now(), language: Language = 'tr'): string {
  const elapsedSeconds = Math.max(0, Math.round((now - new Date(isoDate).getTime()) / 1000));
  const number = new Intl.NumberFormat(localeFor(language));
  if (elapsedSeconds < 60) return language === 'tr' ? 'şimdi' : 'Just now';
  if (elapsedSeconds < 60 * 60) {
    const minutes = number.format(Math.floor(elapsedSeconds / 60));
    return language === 'tr' ? `${minutes} dk önce` : `${minutes} min ago`;
  }
  if (elapsedSeconds < 24 * 60 * 60) {
    const hours = number.format(Math.floor(elapsedSeconds / 3600));
    return language === 'tr' ? `${hours} sa önce` : `${hours} h ago`;
  }
  return formatUploadDate(isoDate, now, language);
}

export function formatPlaybackTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}
