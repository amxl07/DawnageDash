import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { localDateString } from '@/lib/dates';

/** Home follows the current day; editors deliberately keep their own frozen date. */
export function useHomeDate(): string {
  const [date, setDate] = useState(() => localDateString());
  const refresh = useCallback(() => setDate(localDateString()), []);
  useFocusEffect(refresh);
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, [date, refresh]);
  return date;
}
