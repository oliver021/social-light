import { type MutableRefObject } from 'react';
import { NotificationItem } from '../types';
import { notificationsApi, getProfile } from '../api/gateway';
import { notificationToItem } from '../api/mappers';
import { usePersistentState } from './usePersistentState';

interface Deps {
  myUserId: MutableRefObject<string>;
}

/**
 * Notifications (M7): real per-recipient notifications from the Notifications
 * module, plus the client-side producers (`notify`) that other domains call on
 * follow/comment. `addNotification` is still client-only (not persisted server-side).
 */
export function useNotifications({ myUserId }: Deps) {
  const [notifications, setNotifications] = usePersistentState<NotificationItem[]>(
    'nexus_notifications',
    () => [],
  );

  // Read mine (filter by recipientId), resolve actors via Profile, synthesize text.
  // The v0 modules don't emit notifications server-side yet, so `notify` records them
  // client-side (the eventual path is backend event consumers).
  const loadNotifications = async () => {
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

  return { notifications, loadNotifications, notify, addNotification, markNotificationsAsRead };
}
