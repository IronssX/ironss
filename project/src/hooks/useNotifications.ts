import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type ActivityNotification,
  NOTIFICATION_PAGE_SIZE,
} from '@/services/notificationService';
import { requireSupabase } from '@/lib/supabase';
import { logSupabaseFailure } from '@/utils/supabaseDiagnostics';

function mergeNotifications(
  existing: ActivityNotification[],
  incoming: ActivityNotification[],
): ActivityNotification[] {
  const byId = new Map(existing.map((notification) => [notification.id, notification]));
  for (const notification of incoming) byId.set(notification.id, notification);
  return [...byId.values()].sort((first, second) =>
    new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [error, setError] = useState<unknown>(null);
  const [actionError, setActionError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setHasMore(false);
      setLoadedCount(0);
      setIsLoadingMore(false);
      setIsLoading(false);
      setError(null);
      setActionError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setActionError(null);
    try {
      const [fetched, exactUnreadCount] = await Promise.all([
        fetchNotifications(userId),
        fetchUnreadNotificationCount(userId),
      ]);
      setNotifications((current) => mergeNotifications(current, fetched));
      setUnreadCount(exactUnreadCount);
      setHasMore(fetched.length === NOTIFICATION_PAGE_SIZE);
      setLoadedCount((current) => Math.max(current, fetched.length));
    } catch (fetchError) {
      setError(fetchError);
      logSupabaseFailure('notifications', 'fetch', fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const timerId = window.setInterval(() => {
      void refresh();
    }, 60_000);

    return () => window.clearInterval(timerId);
  }, [refresh, userId]);

  useEffect(() => {
    let active = true;
    let channel: RealtimeChannel | null = null;
    setNotifications([]);
    setUnreadCount(0);
    setHasMore(false);
    setLoadedCount(0);
    setIsLoadingMore(false);
    setError(null);
    setActionError(null);
    setIsLoading(Boolean(userId));

    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      channel = requireSupabase()
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
          (payload) => {
            const inserted = payload.new as { id?: unknown; recipient_id?: unknown };
            if (inserted.recipient_id !== userId || typeof inserted.id !== 'string') return;
            Promise.all([
              fetchNotifications(userId, inserted.id),
              fetchUnreadNotificationCount(userId),
            ])
              .then(([items, exactUnreadCount]) => {
                if (!active) return;
                setNotifications((current) => mergeNotifications(current, items));
                setUnreadCount(exactUnreadCount);
                setHasMore(items.length === NOTIFICATION_PAGE_SIZE);
                setLoadedCount(items.length);
              })
              .catch((fetchError: unknown) => {
                if (!active) return;
                setError(fetchError);
                logSupabaseFailure('notifications', 'fetchRealtimeNotification', fetchError);
              });
          },
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
          (payload) => {
            const updated = payload.new as { id?: unknown; recipient_id?: unknown; read_at?: unknown };
            if (
              updated.recipient_id !== userId ||
              typeof updated.id !== 'string' ||
              (updated.read_at !== null && typeof updated.read_at !== 'string')
            ) return;
            const readAt = typeof updated.read_at === 'string' ? updated.read_at : null;
            setNotifications((current) => current.map((notification) =>
              notification.id === updated.id
                ? { ...notification, readAt }
                : notification,
            ));
            fetchUnreadNotificationCount(userId)
              .then((count) => {
                if (active) setUnreadCount(count);
              })
              .catch((countError: unknown) => {
                if (!active) return;
                setError(countError);
                logSupabaseFailure('notifications', 'refreshUnreadCount', countError);
              });
          },
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const channelError = new Error(`Notification realtime channel status: ${status}`);
            if (active) setError(channelError);
            logSupabaseFailure('notifications', 'subscribe', channelError);
          }
        });
    } catch (subscribeError) {
      setError(subscribeError);
      logSupabaseFailure('notifications', 'subscribe', subscribeError);
    }

    Promise.all([
      fetchNotifications(userId),
      fetchUnreadNotificationCount(userId),
    ])
      .then(([items, exactUnreadCount]) => {
        if (!active) return;
        setNotifications((current) => mergeNotifications(current, items));
        setUnreadCount(exactUnreadCount);
      })
      .catch((fetchError: unknown) => {
        if (!active) return;
        setError(fetchError);
        logSupabaseFailure('notifications', 'fetch', fetchError);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      if (channel) void requireSupabase().removeChannel(channel);
    };
  }, [userId]);

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (!userId || !hasMore || isLoadingMore) return false;
    setIsLoadingMore(true);
    try {
      const nextPage = await fetchNotifications(userId, undefined, loadedCount);
      setNotifications((current) => mergeNotifications(current, nextPage));
      setLoadedCount((current) => current + nextPage.length);
      setHasMore(nextPage.length === NOTIFICATION_PAGE_SIZE);
      setError(null);
      return true;
    } catch (fetchError) {
      setError(fetchError);
      logSupabaseFailure('notifications', 'loadMore', fetchError);
      return false;
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loadedCount, userId]);

  const markRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!userId) return false;
    const wasUnread = notifications.some((notification) => notification.id === notificationId && !notification.readAt);
    try {
      await markNotificationRead(notificationId, userId);
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) =>
        notification.id === notificationId ? { ...notification, readAt } : notification,
      ));
      if (wasUnread) setUnreadCount((current) => Math.max(0, current - 1));
      setActionError(null);
      return true;
    } catch (markError) {
      setActionError(markError);
      logSupabaseFailure('notifications', 'markRead', markError);
      return false;
    }
  }, [notifications, userId]);

  const markAllRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    try {
      const updatedIds = new Set(await markAllNotificationsRead(userId));
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) =>
        updatedIds.has(notification.id) ? { ...notification, readAt } : notification,
      ));
      setUnreadCount((current) => Math.max(0, current - updatedIds.size));
      setActionError(null);
      return true;
    } catch (markError) {
      setActionError(markError);
      logSupabaseFailure('notifications', 'markAllRead', markError);
      return false;
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    actionError,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  };
}
