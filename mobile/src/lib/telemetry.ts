import * as Sentry from '@sentry/react-native';

import { setDiagnosticSink } from './diagnostics';
import { sanitizeTelemetryEvent } from './telemetry-event';

let enabled = false;

/** Optional, explicitly scoped error reporting. Expo Go needs no native module. */
export function initializeTelemetry(): void {
  if (enabled || __DEV__ || !process.env.EXPO_PUBLIC_SENTRY_DSN) return;
  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      // Native crashes and app-killing JS errors must reach us in production.
      // Expo Go has no native module; the SDK skips native there by itself.
      enableNative: true,
      enableNativeCrashHandling: true,
      defaultIntegrations: false,
      integrations: [Sentry.reactNativeErrorHandlersIntegration({ onerror: true, onunhandledrejection: true })],
      enableAutoSessionTracking: false,
      enableAutoPerformanceTracing: false,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      // No breadcrumbs, JS or native: request URLs can carry account IDs.
      maxBreadcrumbs: 0,
      beforeBreadcrumb: () => null,
      beforeSend: (event) => sanitizeTelemetryEvent(event as unknown as Record<string, unknown>) as typeof event | null,
    });
    enabled = true;
    setDiagnosticSink((diagnostic) => {
      Sentry.captureMessage(`Dawnage ${diagnostic.event}`, { extra: { diagnostic } });
    });
  } catch {
    // Missing or invalid reporting configuration must never block startup.
  }
}

export function reportScreenError(error: Error): void {
  if (!enabled) return;
  try {
    Sentry.captureException(error, { extra: { diagnostic: { event: 'screen_error', area: 'app', outcome: 'error' } } });
  } catch { /* Recovery works even if reporting is unavailable. */ }
}
