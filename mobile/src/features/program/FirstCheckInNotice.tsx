import { format } from 'date-fns';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';

export function FirstCheckInNotice({ date, review }: { date: string; review: boolean }) {
  const { colors } = useTheme();
  if (!review) return null;
  return <View testID="first-checkin-notice" style={{ backgroundColor: colors.primarySoft, borderRadius: 20, padding: 18, gap: spacing.sm }}>
    <Text variant="label" tone="primary">This check-in starts Day 1</Text>
    <Text variant="bodySm">{`Submitting this check-in starts Day 1 on ${format(parseLocalDate(date), 'd MMMM yyyy')}. Drafts do not start your program.`}</Text>
  </View>;
}
