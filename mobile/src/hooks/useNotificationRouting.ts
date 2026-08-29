import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { reconcile } from '@/lib/reminders';

// Foreground presentation — otherwise a reminder that fires while the app is
// open is silently swallowed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ROUTES: Record<string, string> = {
  '/check-in': '/(app)/(tabs)/check-in',
  '/weekly-feedback': '/(app)/weekly-feedback',
};

/**
 * Routes a notification tap, from background AND from a cold start.
 * Also reconciles schedules on foreground — the OS can clear them.
 */
export function useNotificationRouting(enabled: boolean) {
  const router = useRouter();
  const handledColdStart = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const go = (data: unknown) => {
      const url = (data as { url?: string } | null)?.url;
      const target = url ? ROUTES[url] : null;
      if (target) router.push(target as never);
    };

    // Cold start: the tap that launched the app.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) go(response.notification.request.content.data);
      });
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      go(response.notification.request.content.data);
    });

    void reconcile();
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void reconcile();
    });

    return () => {
      sub.remove();
      appSub.remove();
    };
  }, [enabled, router]);
}
