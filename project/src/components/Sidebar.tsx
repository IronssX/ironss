import {
  Bell,
  Compass,
  Home,
  Clapperboard,
  Library,
  PanelsTopLeft,
  Plus,
  Settings,
  type LucideIcon,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/i18n';
import type { Page } from '@/types/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface SidebarProps {
  activePage: Page;
  isOpen: boolean;
  onNavigate: (page: Page) => void;
  onClose: () => void;
}

const NAV_ITEMS: { page: Page; label: TranslationKey; icon: LucideIcon }[] = [
  { page: 'home', label: 'sidebar.home', icon: Home },
  { page: 'explore', label: 'sidebar.explore', icon: Compass },
  { page: 'shorts', label: 'sidebar.shorts', icon: Clapperboard },
  { page: 'subscriptions', label: 'sidebar.subscriptions', icon: Users },
  { page: 'library', label: 'sidebar.library', icon: Library },
  { page: 'notifications', label: 'topbar.notifications', icon: Bell },
  { page: 'studio', label: 'studio.title', icon: PanelsTopLeft },
  { page: 'settings', label: 'sidebar.settings', icon: Settings },
];

export function Sidebar({ activePage, isOpen, onNavigate, onClose }: SidebarProps) {
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const visibleNavItems = NAV_ITEMS.filter(({ page }) => page !== 'studio' || Boolean(user));
  const mobileItems = visibleNavItems.filter(({ page }) => ['home', 'explore', 'shorts', 'library'].includes(page));

  const navigate = (page: Page) => {
    onNavigate(page);
    onClose();
    setIsMoreOpen(false);
  };

  return (
    <>
      <div
        onClick={() => {
          setIsMoreOpen(false);
          onClose();
        }}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen || isMoreOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[min(84vw,19rem)] flex-col border-r border-white/[0.07] bg-[#101014] px-4 pb-6 pt-5 transition-transform duration-300 ease-out md:fixed md:top-[76px] md:z-20 md:h-[calc(100dvh-76px)] md:w-[248px] md:shrink-0 md:translate-x-0 md:border-r md:border-white/[0.06] md:bg-[#0b0a10]/90 md:px-4 md:pt-7 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-9 flex items-center justify-between md:hidden">
          <Logo onClick={() => navigate('home')} />
          <button type="button" onClick={onClose} aria-label={t('topbar.closeMenu')} className="icon-button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="eyebrow mb-3 hidden px-3 md:block">{t('sidebar.discover')}</p>
        <nav aria-label={t('sidebar.navigation')} className="flex flex-col gap-1">
          {visibleNavItems.map(({ page, label, icon: Icon }) => {
            const isActive = activePage === page;
            return (
              <button
                key={page}
                type="button"
                onClick={() => navigate(page)}
                aria-current={isActive ? 'page' : undefined}
                className={`nav-item flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13px] font-semibold transition-colors ${
                  isActive
                    ? 'nav-item-active text-white'
                    : 'text-gray-400 hover:bg-white/[0.045] hover:text-white'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-neon-300' : ''}`} strokeWidth={1.8} />
                {t(label)}
              </button>
            );
          })}
        </nav>

        {user ? (
          <button type="button" onClick={() => navigate('upload-choice')} className="primary-button mt-8 hidden md:flex">
            <Plus className="h-4 w-4" />
            {t('topbar.upload')}
          </button>
        ) : null}

        <div className="mt-auto hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 md:block">
          <div className="mb-3 flex items-center gap-2 text-neon-300">
            <span className="h-1.5 w-1.5 rounded-full bg-neon-300 shadow-[0_0_10px_rgba(198,115,255,.9)]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{t('sidebar.yourSpace')}</span>
          </div>
          <p className="text-xs leading-relaxed text-gray-500">{t('sidebar.spaceDescription')}</p>
          <button
            type="button"
            onClick={() => navigate(user ? 'profile' : 'login')}
            className="mt-4 flex items-center gap-2 text-xs font-semibold text-gray-300 transition-colors hover:text-white"
          >
            <UserRound className="h-4 w-4 text-neon-300" />
            {user ? t('topbar.account') : t('topbar.signIn')}
          </button>
        </div>
      </aside>

      <nav aria-label={t('sidebar.navigation')} className="mobile-dock fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#15151b]/95 p-1.5 shadow-[0_12px_42px_rgba(0,0,0,.52)] backdrop-blur-xl md:hidden">
        {mobileItems.map(({ page, label, icon: Icon }) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              type="button"
              onClick={() => navigate(page)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-semibold transition-colors ${
                isActive ? 'bg-neon-500/15 text-neon-200' : 'text-gray-500 hover:text-gray-200'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
              <span className="max-w-full truncate">{t(label)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMoreOpen((current) => !current)}
          aria-expanded={isMoreOpen}
          className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] font-semibold transition-colors ${
            isMoreOpen ? 'bg-neon-500/15 text-neon-200' : 'text-gray-500 hover:text-gray-200'
          }`}
        >
          <PanelsTopLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
          <span>{t('sidebar.more')}</span>
        </button>
      </nav>

      {isMoreOpen && (
        <div className="fixed bottom-[5.5rem] right-3 z-50 w-56 rounded-2xl border border-white/10 bg-[#19191f] p-2 shadow-2xl md:hidden">
          {visibleNavItems
            .filter(({ page }) => !mobileItems.some((item) => item.page === page))
            .map(({ page, label, icon: Icon }) => (
              <button key={page} type="button" onClick={() => navigate(page)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
                <Icon className="h-4 w-4 text-neon-300" />
                {t(label)}
              </button>
            ))}
          <button type="button" onClick={() => navigate(user ? 'profile' : 'login')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
            <UserRound className="h-4 w-4 text-neon-300" />
            {user ? t('topbar.account') : t('topbar.signIn')}
          </button>
          {user && (
            <button type="button" onClick={() => navigate('upload-choice')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
              <Plus className="h-4 w-4 text-neon-300" />
              {t('topbar.upload')}
            </button>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-white/[0.07] px-3 py-3">
            <span className="text-xs text-gray-500">{t('language.select')}</span>
            <div className="flex items-center gap-1">
              {(['tr', 'en'] as const).map((nextLanguage) => (
                <button
                  key={nextLanguage}
                  type="button"
                  onClick={() => {
                    setLanguage(nextLanguage);
                    setIsMoreOpen(false);
                  }}
                  aria-pressed={language === nextLanguage}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${language === nextLanguage ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                >
                  {nextLanguage.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
