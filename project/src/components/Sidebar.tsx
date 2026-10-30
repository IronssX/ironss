import { Compass, Home, Library, PanelsTopLeft, type LucideIcon, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/i18n';
import type { Page } from '@/types/navigation';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  activePage: Page;
  isOpen: boolean;
  onNavigate: (page: Page) => void;
  onClose: () => void;
}

const NAV_ITEMS: { page: Page; label: TranslationKey; icon: LucideIcon }[] = [
  { page: 'home', label: 'sidebar.home', icon: Home },
  { page: 'explore', label: 'sidebar.explore', icon: Compass },
  { page: 'subscriptions', label: 'sidebar.subscriptions', icon: Users },
  { page: 'library', label: 'sidebar.library', icon: Library },
  { page: 'studio', label: 'studio.title', icon: PanelsTopLeft },
];

export function Sidebar({ activePage, isOpen, onNavigate, onClose }: SidebarProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-x-0 bottom-0 top-16 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 flex w-64 flex-col border-r border-surface-border bg-background transition-transform duration-300 ease-out md:sticky md:top-16 md:z-20 md:h-[calc(100vh-4rem)] md:w-60 md:shrink-0 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav aria-label={t('sidebar.navigation')} className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.filter(({ page }) => page !== 'studio' || Boolean(user)).map(({ page, label, icon: Icon }) => {
            const isActive = activePage === page;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onNavigate(page)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-4 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-neon-500/15 text-neon-300'
                    : 'text-gray-300 hover:bg-surface-hover hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {t(label)}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-xl border border-surface-border bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-neon-400">{t('sidebar.prototype')}</p>
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              {t('sidebar.prototypeDescription')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
