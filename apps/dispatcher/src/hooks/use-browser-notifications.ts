'use client';

import { useCallback } from 'react';

export function useBrowserNotifications() {
  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions & { onClick?: () => void }) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const { onClick, ...rest } = options ?? {};
      const n = new Notification(title, { icon: '/favicon.ico', ...rest });
      n.onclick = () => {
        window.focus();
        onClick?.();
      };
    },
    [],
  );

  return { requestPermission, notify };
}

export function sendNotification(title: string, body?: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, { ...(body ? { body } : {}), icon: '/favicon.ico' });
  n.onclick = () => window.focus();
}
