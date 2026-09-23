import { format } from 'date-fns';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';

export function FirstCheckInNotice({ date, review }: { date: string; review: boolean }) {
  const { colors } = useTheme();
  return <View testID="first-checkin-notice" style={{ backgroundColor: colors.primarySoft, borderRadius: 20, padding: 18, gap: spacing.sm }}>
    <Text variant="label" tone="primary">{review ? 'This check-in starts Day 1' : 'Your first check-in'}</Text>
    <Text variant="bodySm">{review ? `Your program will begin on ${format(parseLocalDate(date), 'd MMMM yyyy')}, the date of this check-in. Submit when you’re ready to start.` : 'A few honest answers give your coach a starting point. Your first submission starts Day 1, even before your coach connects.'}</Text>
    {!review ? <Text variant="bodySm" tone="muted">You can save a draft and come back. Your program won’t start from a draft.</Text> : null}
  </View>;
}
