import * as Notifications from 'expo-notifications';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { hasCheckInExitGuard, requestCheckInTabExit } from '@/features/checkin/checkInExitGuard';
import { localDateString } from '@/lib/dates';
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
  '/weekly-feedback': '/(app)/weekly-feedback',
};

function notificationRoute(data: unknown): Href | null {
  const url = (data as { url?: string } | null)?.url;
  if (url === '/check-in') {
    return { pathname: '/(app)/daily-check-in', params: { date: localDateString() } };
  }
  return url && ROUTES[url] ? ROUTES[url] as Href : null;
}

/**
 * Routes a notification tap, from background AND from a cold start.
 * Also reconciles schedules on foreground — the OS can clear them.
 */
export function useNotificationRouting(enabled: boolean, pathname?: string) {
  const router = useRouter();
  const handledColdStart = useRef(false);
  const pathnameRef = useRef(pathname);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const go = (data: unknown) => {
      const target = notificationRoute(data);
      if (active && target) {
        const replaceEditor = pathnameRef.current === '/daily-check-in' || hasCheckInExitGuard();
        void requestCheckInTabExit(() => {
          if (!active) return;
          if (replaceEditor) router.replace(target);
          else router.push(target);
        });
      }
    };

    // Cold start: the tap that launched the app.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) go(response.notification.request.content.data);
      }).catch(() => {});
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      go(response.notification.request.content.data);
    });

    // Foreground repair is opportunistic; Settings reports explicit scheduling
    // failures and reads the actual OS schedule when the user opens it.
    void reconcile().catch(() => {});
    const appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void reconcile().catch(() => {});
    });

    return () => {
      active = false;
      sub.remove();
      appSub.remove();
    };
  }, [enabled, router]);
}
