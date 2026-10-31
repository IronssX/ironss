import { Bell, LogIn, Menu, Search, Upload, User, X } from 'lucide-react';
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
  unreadCount: number;
}

export function TopBar({ query, onQueryChange, onToggleSidebar, onGoHome, onNavigate, unreadCount }: TopBarProps) {
  const { user, profile, avatarUrl, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-[76px] border-b border-white/[0.06] bg-[#0c0c10]/85 backdrop-blur-2xl">
      <div className="flex h-full items-center gap-2.5 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t('topbar.menu')}
          className="icon-button shrink-0 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="shrink-0">
          <Logo onClick={onGoHome} />
        </div>

        <form onSubmit={(event) => event.preventDefault()} role="search" className="mx-auto flex min-w-0 w-full max-w-[620px] flex-1 items-center">
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
              className="search-field h-11 w-full rounded-2xl border border-white/[0.08] bg-white/[0.035] pl-11 pr-10 text-sm text-gray-100 placeholder:text-gray-500 transition-all focus:border-neon-500/50 focus:bg-white/[0.055] focus:outline-none focus:ring-2 focus:ring-neon-500/15 [&::-webkit-search-cancel-button]:hidden"
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

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            aria-label={t('topbar.notificationsWithCount', { count: unreadCount })}
            title={t('topbar.notifications')}
            className="icon-button relative inline-flex"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span aria-hidden="true" className="notification-badge absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[#0c0c10] bg-neon-400 px-1 text-[9px] font-bold leading-none text-[#160e1d]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <div role="group" aria-label={t('language.select')} className="hidden items-center rounded-xl border border-white/[0.08] bg-white/[0.025] p-1 sm:flex">
            <button
              type="button"
              onClick={() => setLanguage('tr')}
              aria-label={t('language.turkish')}
              aria-pressed={language === 'tr'}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${language === 'tr' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-label={t('language.english')}
              aria-pressed={language === 'en'}
              className={`rounded-lg px-2 py-1 text-[10px] font-bold transition-colors ${language === 'en' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
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
                onClick={() => onNavigate('upload-choice')}
                aria-label={t('topbar.upload')}
                className="secondary-button h-10 px-3 md:px-4"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden md:inline">{t('topbar.upload')}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                aria-label={t('topbar.account')}
                className="profile-pill flex h-10 items-center gap-2 rounded-xl py-1 pl-1 pr-1 transition-colors sm:pr-3"
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
                className="primary-button h-10 px-3 sm:px-4"
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
