import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PlaceholderPage({ icon: Icon, title, message, actionLabel, onAction }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center animate-fade-in">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neon-500/15 shadow-[0_0_28px_-6px_rgba(176,38,255,0.8)]">
        <Icon className="h-8 w-8 text-neon-300" />
      </span>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-2 rounded-lg bg-neon-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neon-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
