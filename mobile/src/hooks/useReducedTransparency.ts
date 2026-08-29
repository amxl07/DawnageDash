import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReducedTransparency(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceTransparencyEnabled().then(setReduced);
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);

    return () => subscription.remove();
  }, []);

  return reduced;
}
