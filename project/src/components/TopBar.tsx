import { LogIn, Menu, Search, Upload, User, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/hooks/useAuth';
import type { Page } from '@/types/navigation';
import { useLanguage } from '@/hooks/useLanguage';

interface TopBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onToggleSidebar: () => void;
  onGoHome: () => void;
  onNavigate: (page: Page) => void;
}

export function TopBar({ query, onQueryChange, onToggleSidebar, onGoHome, onNavigate }: TopBarProps) {
  const { user, profile, avatarUrl, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-16 border-b border-surface-border bg-background/90 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-3 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t('topbar.menu')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-200 transition-colors hover:bg-surface-hover md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="shrink-0">
          <Logo onClick={onGoHome} />
        </div>

        <form onSubmit={(event) => event.preventDefault()} role="search" className="mx-auto flex w-full max-w-xl items-center">
          <div className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) onQueryChange('');
              }}
              placeholder={t('topbar.searchPlaceholder')}
              aria-label={t('topbar.searchPlaceholder')}
              className="h-10 w-full rounded-full border border-surface-border bg-surface pl-11 pr-10 text-sm text-gray-100 placeholder:text-gray-500 transition-colors focus:border-neon-500 focus:outline-none focus:ring-2 focus:ring-neon-500/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label={t('topbar.clearSearch')}
                className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-surface-hover hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        <div className="flex shrink-0 items-center gap-2">
          <div role="group" aria-label={t('language.select')} className="flex items-center rounded-full border border-surface-border p-0.5">
            <button
              type="button"
              onClick={() => setLanguage('tr')}
              aria-label={t('language.turkish')}
              aria-pressed={language === 'tr'}
              className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${language === 'tr' ? 'bg-neon-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-label={t('language.english')}
              aria-pressed={language === 'en'}
              className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors ${language === 'en' ? 'bg-neon-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              EN
            </button>
          </div>
          {isLoading ? (
            <span className="h-10 w-10" aria-hidden="true" />
          ) : user ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                aria-label={t('topbar.upload')}
                className="flex h-10 items-center gap-2 rounded-full border border-neon-500/50 px-3 text-sm font-medium text-neon-300 transition-colors hover:bg-neon-500/10 md:px-4"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">{t('topbar.upload')}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
              aria-label={t('topbar.account')}
              className="flex h-10 items-center gap-2 rounded-full border border-surface-border bg-surface py-1 pl-1 pr-1 transition-colors hover:border-neon-500/60 hover:bg-surface-hover sm:pr-3"
            >
              <UserAvatar name={profile?.username ?? user.email ?? t('topbar.account')} imageUrl={avatarUrl} className="h-8 w-8" />
              <span className="hidden max-w-[7rem] truncate text-sm font-medium text-gray-100 sm:block">
                {profile?.username ?? t('topbar.account')}
              </span>
            </button>
            </>
          ) : (
            <>
              <span className="hidden items-center gap-1.5 text-sm text-gray-400 md:flex">
                <User className="h-4 w-4" />
                {t('profile.guest')}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('login')}
                aria-label={t('topbar.signIn')}
                className="flex h-10 items-center gap-2 rounded-full bg-neon-500 px-3 text-sm font-medium text-white shadow-[0_0_18px_-6px_rgba(176,38,255,0.9)] transition-all duration-200 hover:bg-neon-400 active:scale-95 sm:px-4"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">{t('topbar.signIn')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
