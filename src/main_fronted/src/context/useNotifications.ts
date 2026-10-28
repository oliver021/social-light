import { useState, type MutableRefObject } from 'react';
import { NotificationItem } from '../types';
import { notificationsApi, getProfile } from '../api/gateway';
import { notificationToItem } from '../api/mappers';
import { usePersistentState } from './usePersistentState';
import { type ToastSeverity } from './useToast';

interface Deps {
  myUserId: MutableRefObject<string>;
  showToast: (message: string, severity?: ToastSeverity) => void;
}

/**
 * Notifications (M7): real per-recipient notifications from the Notifications
 * module, plus the client-side producers (`notify`) that other domains call on
 * follow/comment. `addNotification` is still client-only (not persisted server-side).
 */
export function useNotifications({ myUserId, showToast }: Deps) {
  const [notifications, setNotifications] = usePersistentState<NotificationItem[]>(
    'nexus_notifications',
    () => [],
  );

  // True until the first notifications load settles, so the menu can show a skeleton.
  const [loading, setLoading] = useState(true);

  // Read mine (filter by recipientId), resolve actors via Profile, synthesize text.
  // The v0 modules don't emit notifications server-side yet, so `notify` records them
  // client-side (the eventual path is backend event consumers).
  const loadNotifications = async () => {
    try {
      await fetchNotifications();
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    const { data } = await notificationsApi.GET('/api/notifications');
    if (!data) return;
    const myId = myUserId.current;
    const mine = data.filter((n) => n.recipientId === myId);
    if (mine.length === 0) {
      setNotifications([]);
      return;
    }
    const actorIds = [...new Set(mine.map((n) => n.actorId))];
    const profiles = await Promise.all(actorIds.map((id) => getProfile(id).catch(() => null)));
    const actorById = new Map(actorIds.map((id, i) => [id, profiles[i]]));
    setNotifications([...mine].reverse().map((n) => notificationToItem(n, actorById.get(n.actorId) ?? null)));
  };

  // Fire-and-forget: record a notification for someone else (actor = me). No-op for self.
  const notify = (recipientId: string | undefined, type: string, entityType: string, entityId: string) => {
    if (!recipientId || recipientId === myUserId.current) return;
    notificationsApi
      .POST('/api/notifications', {
        body: { recipientId, actorId: myUserId.current, type, entityType, entityId, isRead: false },
      })
      .catch(() => {});
  };

  const markNotificationsAsRead = () => {
    setNotifications((prevNotif) => prevNotif.map((n) => ({ ...n, read: true })));
  };

  const addNotification = (type: NotificationItem['type'], actorName: string, text: string, postId?: string) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type,
      actor: {
        name: actorName,
        avatar: actorName === 'Sarah Kim' ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80' :
                actorName === 'Elena Rostova' ? 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80' :
                actorName === 'Dave Morrison' ? 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80' :
                'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&h=120&q=80'
      },
      text,
      createdAt: 'Just now',
      read: false,
      postId
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Remove one notification. Client-only items (`notif-*`, from addNotification) are dropped
  // locally; the rest are deleted on the server first. Resolves false when it was not removed.
  const removeNotification = async (id: string): Promise<boolean> => {
    if (id.startsWith('notif-')) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return true;
    }
    try {
      const { response } = await notificationsApi.DELETE('/api/notifications/{id}', { params: { path: { id } } });
      if (!response.ok) return false;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      return true;
    } catch {
      return false;
    }
  };

  // Dismiss one notification. Notifications are low stakes, so there is no confirm step.
  const dismissNotification = async (id: string): Promise<void> => {
    const removed = await removeNotification(id);
    if (!removed) showToast('The notification was not removed');
  };

  // Dismiss every listed notification, one request at a time. Failures stay in the list.
  const clearNotifications = async (): Promise<void> => {
    const failed: string[] = [];
    for (const n of notifications) {
      if (!(await removeNotification(n.id))) failed.push(n.id);
    }
    if (failed.length > 0) showToast('Some notifications could not be removed');
  };

  // Forget the previous account's notifications (used when the signed-in user changes).
  const reset = () => setNotifications([]);

  return {
    notifications,
    loading,
    loadNotifications,
    notify,
    addNotification,
    markNotificationsAsRead,
    dismissNotification,
    clearNotifications,
    reset,
  };
}
