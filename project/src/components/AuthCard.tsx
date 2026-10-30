import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="auth-shell mx-auto flex w-full max-w-[440px] animate-fade-in flex-col gap-7 rounded-[28px] border border-white/[0.08] p-6 sm:p-9">
      <div className="flex justify-center">
        <Logo />
      </div>
      <div className="text-center">
        <h1 className="text-[26px] font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
