import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { formatDate } from '@/domain/date';

const systemNow = () => new Date();

export function useCurrentDate(now: () => Date = systemNow): string {
  const [date, setDate] = useState(() => formatDate(now()));
  const refresh = useCallback(() => {
    const currentDate = formatDate(now());
    setDate((previousDate) => previousDate === currentDate ? previousDate : currentDate);
  }, [now]);

  useFocusEffect(refresh);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => subscription.remove();
  }, [refresh]);

  return date;
}
