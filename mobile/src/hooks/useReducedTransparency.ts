import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;

    void AccessibilityInfo.isReduceTransparencyEnabled().then((initialPreference) => {
      if (active && !receivedEvent) {
        setReduced(initialPreference);
      }
    });
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
