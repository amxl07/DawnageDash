import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;

    // The preference is absent on React Native Web and some platform adapters.
    if (typeof AccessibilityInfo.isReduceTransparencyEnabled !== 'function') return;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((initialPreference) => {
      if (active && !receivedEvent) {
        setReduced(initialPreference);
      }
    }).catch(() => { /* Retain the platform fallback when preference lookup fails. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', (value) => {
      receivedEvent = true;
      if (active) {
        setReduced(value);
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
