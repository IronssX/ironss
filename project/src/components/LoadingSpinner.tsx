interface LoadingSpinnerProps {
  label?: string;
}

import { useLanguage } from '@/hooks/useLanguage';

export function LoadingSpinner({ label }: LoadingSpinnerProps) {
  const { t } = useLanguage();

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-3">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-neon-500/25 border-t-neon-500 shadow-[0_0_24px_-4px_rgba(176,38,255,0.8)]" />
      <span className="text-sm font-medium text-gray-200">{label ?? t('loading.video')}</span>
    </div>
  );
}
