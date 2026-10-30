import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="mx-auto flex w-full max-w-md animate-fade-in flex-col gap-6 rounded-2xl border border-surface-border bg-surface p-6 shadow-[0_0_40px_-12px_rgba(176,38,255,0.5)] sm:p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
