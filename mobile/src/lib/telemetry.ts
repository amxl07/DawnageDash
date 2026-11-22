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
      enableNative: false,
      defaultIntegrations: false,
      enableAutoSessionTracking: false,
      sendDefaultPii: false,
      tracesSampleRate: 0,
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
