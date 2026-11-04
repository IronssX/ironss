import { Bell, Check, CheckCheck, Heart, MessageCircle, RefreshCw, Reply, UserRound, Video } from 'lucide-react';
import { useState } from 'react';
import { UserAvatar } from '@/components/UserAvatar';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/hooks/useSettings';
import type { ActivityNotification } from '@/services/notificationService';
import { formatTimeAgo } from '@/utils/format';

interface NotificationsPageProps {
  notifications: ActivityNotification[];
  unreadCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: unknown;
  actionError: unknown;
  isSignedIn: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
  onMarkRead: (notificationId: string) => Promise<boolean>;
  onMarkAllRead: () => Promise<boolean>;
  onOpenVideo: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onSignIn: () => void;
}

function getNotificationIcon(type: ActivityNotification['type']) {
  if (type === 'channel_connected') return UserRound;
  if (type === 'new_video') return Video;
  if (type === 'new_like') return Heart;
  if (type === 'comment_reply') return Reply;
  return MessageCircle;
}

export function NotificationsPage({
  notifications,
  unreadCount,
  isLoading,
  isLoadingMore,
  hasMore,
  error,
  actionError,
  isSignedIn,
  onRefresh,
  onLoadMore,
  onMarkRead,
  onMarkAllRead,
  onOpenVideo,
  onOpenChannel,
  onSignIn,
}: NotificationsPageProps) {
  const { language, t } = useLanguage();
  const { reduceMotion } = useSettings();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const visibleNotifications = filter === 'unread'
    ? notifications.filter((notification) => !notification.readAt)
    : notifications;

  const openNotification = async (notification: ActivityNotification) => {
    if (!notification.readAt && !(await onMarkRead(notification.id))) return;
    if (notification.videoId) onOpenVideo(notification.videoId);
    else if (notification.channelId) onOpenChannel(notification.channelId);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 animate-fade-in">
      <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#1a1124] via-[#100d16] to-[#0c0b10] px-5 py-7 shadow-[0_24px_80px_rgba(74,25,116,0.12)] sm:px-8 sm:py-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-32 h-72 w-72 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow">{t('notifications.eyebrow')}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{t('notifications.title')}</h1>
            <p className="mt-2 text-sm leading-6 text-gray-400">{t('notifications.description')}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-violet-300/15 bg-violet-300/[0.06] px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
              <Bell className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xl font-semibold tabular-nums text-white">{unreadCount}</span>
              <span className="block text-xs text-gray-400">{t('notifications.unreadSummary')}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label={t('notifications.filter')} className="flex w-fit rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
          {(['all', 'unread'] as const).map((value) => (
            <button
              type="button"
              key={value}
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${filter === value ? 'bg-violet-400/15 text-violet-100' : 'text-gray-500 hover:text-white'}`}
            >
              {t(value === 'all' ? 'notifications.all' : 'notifications.unreadFilter')}
              {value === 'unread' && unreadCount > 0 && <span className="ml-2 text-violet-200">{unreadCount}</span>}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSignedIn && unreadCount > 0 && (
            <button type="button" onClick={() => void onMarkAllRead()} className="secondary-button h-10 px-4 text-xs">
              <CheckCheck className="h-4 w-4" />
              {t('notifications.markAllRead')}
            </button>
          )}
          {isSignedIn && (
            <button type="button" onClick={onRefresh} className="icon-button h-10 w-10" aria-label={t('notifications.refresh')}>
              <RefreshCw className={`h-4 w-4 ${isLoading && !reduceMotion ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {Boolean(actionError) && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">
          {t('notifications.actionFailed')}
        </p>
      )}

      {!isSignedIn ? (
        <section className="empty-state flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 px-6 text-center">
          <Bell className="h-7 w-7 text-neon-200" />
          <h2 className="mt-4 text-lg font-semibold text-white">{t('notifications.signInTitle')}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">{t('notifications.signInDescription')}</p>
          <button type="button" onClick={onSignIn} className="primary-button mt-5 h-10 px-4 text-xs">
            {t('topbar.signIn')}
          </button>
        </section>
      ) : error && notifications.length === 0 ? (
        <section className="rounded-2xl border border-red-400/20 bg-red-500/[0.06] p-5" role="alert">
          <p className="text-sm text-red-200">{t('notifications.loadFailed')}</p>
          <button type="button" onClick={onRefresh} className="mt-3 text-xs font-semibold text-neon-200 hover:text-white">
            {t('notifications.tryAgain')}
          </button>
        </section>
      ) : isLoading && notifications.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center rounded-[26px] border border-white/[0.07] bg-white/[0.02]">
          <p className="text-sm text-gray-500">{t('notifications.loading')}</p>
        </div>
      ) : visibleNotifications.length === 0 ? (
        <section className="empty-state flex min-h-64 flex-col items-center justify-center rounded-[26px] border border-dashed border-white/10 px-6 text-center">
          <Bell className="h-7 w-7 text-neon-200" />
          <h2 className="mt-4 text-lg font-semibold text-white">
            {filter === 'unread' && unreadCount === 0
              ? t('notifications.noUnreadTitle')
              : filter === 'unread' && hasMore
                ? t('notifications.moreUnreadMayExist')
                : t('notifications.emptyTitle')}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
            {filter === 'unread' && unreadCount === 0
              ? t('notifications.noUnreadDescription')
              : filter === 'unread' && hasMore
                ? t('notifications.loadOlderToFindUnread')
                : t('notifications.emptyDescription')}
          </p>
          {filter === 'unread' && hasMore && (
            <button type="button" onClick={onLoadMore} disabled={isLoadingMore} className="secondary-button mt-5 h-10 px-4 text-xs disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${isLoadingMore && !reduceMotion ? 'animate-spin' : ''}`} />
              {t(isLoadingMore ? 'notifications.loadingMore' : 'notifications.loadOlder')}
            </button>
          )}
        </section>
      ) : (
        <>
          {Boolean(error) && (
            <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3 text-sm text-amber-100">
              {t('notifications.refreshFailed')}
            </p>
          )}
          <section aria-label={t('notifications.history')} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-white/[0.01] p-2 sm:p-3">
            <div className="flex items-center justify-between px-3 py-3">
              <h2 className="text-sm font-semibold text-gray-200">{t('notifications.history')}</h2>
              <span className="text-xs tabular-nums text-gray-500">{t('notifications.historyCount', { count: visibleNotifications.length })}</span>
            </div>
            <ul className="flex flex-col gap-2">
          {visibleNotifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const actorName = notification.actorName ?? t('notifications.ironss');
            const description = notification.type === 'channel_connected'
              ? t('notifications.channelConnected', { name: actorName })
              : notification.type === 'new_video'
                ? t('notifications.newVideo', { name: actorName })
                  : notification.type === 'new_like'
                    ? t('notifications.newLike', { name: actorName })
                    : notification.type === 'comment_reply'
                      ? t('notifications.commentReply', { name: actorName })
                  : t('notifications.newComment', { name: actorName });
            const hasDestination = Boolean(notification.videoId || notification.channelId);

            return (
              <li key={notification.id}>
                <button
                  type="button"
                  disabled={!hasDestination}
                  onClick={() => void openNotification(notification)}
                  className={`notification-card group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 sm:gap-4 sm:p-4 ${
                    notification.readAt
                      ? 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
                      : 'border-neon-300/20 bg-neon-300/[0.055] shadow-[inset_3px_0_0_rgba(198,115,255,.75)] hover:border-neon-300/35 hover:bg-neon-300/[0.08]'
                  } disabled:cursor-default`}
                >
                  <span className="relative shrink-0">
                    <UserAvatar name={actorName} imageUrl={notification.actorAvatarUrl} className="h-11 w-11 sm:h-12 sm:w-12" />
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#111015] bg-[#271b34] text-neon-200">
                      <Icon className="h-3 w-3" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="text-sm font-semibold leading-6 text-gray-100">{description}</span>
                      {!notification.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-neon-300 shadow-[0_0_12px_rgba(198,115,255,.8)]" aria-label={t('notifications.unread')} />}
                    </span>
                    {notification.videoTitle && (
                      <span className="mt-0.5 block truncate text-sm text-neon-200/90">
                        {notification.type === 'new_video' ? notification.videoTitle : t('notifications.videoTitle', { title: notification.videoTitle })}
                      </span>
                    )}
                    <time dateTime={notification.createdAt} className="mt-1.5 block text-xs text-gray-500">
                      {formatTimeAgo(notification.createdAt, Date.now(), language)}
                    </time>
                  </span>
                  {!notification.readAt && <Check className="mt-1 h-4 w-4 shrink-0 text-gray-600 transition-colors group-hover:text-neon-200" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
            </ul>
          </section>
          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="mx-auto inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl border border-violet-300/15 bg-violet-300/[0.05] px-5 text-sm font-medium text-violet-100 transition hover:border-violet-300/30 hover:bg-violet-300/[0.09] disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingMore && !reduceMotion ? 'animate-spin' : ''}`} />
              {t(isLoadingMore ? 'notifications.loadingMore' : 'notifications.loadOlder')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
