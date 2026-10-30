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
    <div className="mx-auto flex min-h-[60vh] max-w-xl animate-fade-in flex-col items-center justify-center gap-5 text-center">
      <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[24px] border border-neon-300/15 bg-neon-300/[0.06]">
        <Icon className="h-7 w-7 text-neon-200" strokeWidth={1.7} />
      </span>
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="primary-button mt-1 h-11 px-5"
        >
          <ArrowLeft className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
