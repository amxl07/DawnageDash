import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, ErrorState, PageHeader, Screen, SkeletonCard, Text } from '@/components/ui';
import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { useHomeDate } from '@/features/home/useHomeDate';
import { useHomeLocal } from '@/features/home/useHomeLocal';
import { processCheckInHistory, type RawDailyCheckIn } from '@/lib/checkin-utils';
import { parseLocalDate } from '@/lib/dates';
import { spacing } from '@/theme';
import { resolveCheckInEntry, type CheckInEntryParams } from './checkin-entry';
import { localCheckInDays } from './dateHistory';
import { CheckInDateHistorySheet } from './components/CheckInDateHistorySheet';

/** Browsing never creates a draft. The one editor lives above the tab navigator. */
export function CheckInHub() {
  const router = useRouter();
  const { date: requestedDate, history: requestedHistory, edit: requestedEdit } = useLocalSearchParams<CheckInEntryParams>();
  const today = useHomeDate();
  const history = useDailyCheckIns();
  const local = useHomeLocal(today);
  const [historyVisible, setHistoryVisible] = useState(false);
  const consumed = useRef<string | null>(null);
  const entry = useMemo(() => resolveCheckInEntry({ date: requestedDate, history: requestedHistory, edit: requestedEdit }, today), [requestedDate, requestedEdit, requestedHistory, today]);
  const entryKey = JSON.stringify(entry);
  useEffect(() => {
    if (entry.destination === 'hub' && !entry.history) { consumed.current = null; return; }
    if (consumed.current === entryKey) return;
    consumed.current = entryKey;
    // Clear the tab's intent before pushing: Back must return to a quiet hub.
    router.setParams({ date: undefined, history: undefined, edit: undefined });
    if (entry.destination === 'editor') router.push({ pathname: '/(app)/daily-check-in', params: entry.params });
    else setHistoryVisible(true);
  }, [entry, entryKey, router]);
  const processed = useMemo(() => processCheckInHistory((history.data ?? []) as RawDailyCheckIn[]), [history.data]);
  const localDays = useMemo(() => localCheckInDays(local.data?.checkIns ?? []), [local.data?.checkIns]);
  const saved = history.data?.find((row) => row.date === today);
  const pending = localDays.find((row) => row.date === today);
  const draft = local.data?.checkInDraft;
  const open = (date: string) => router.push({ pathname: '/(app)/daily-check-in', params: { date } });
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseLocalDate(today));
  const title = pending?.status === 'blocked' ? 'Your record needs attention' : pending ? 'Saved on this device' : saved ? 'Your day, recorded.' : draft?.date === today ? 'Ready to continue' : 'Today’s check-in';
  const detail = pending?.status === 'blocked' ? 'Your values are preserved. Open this record to review and retry delivery.' : pending ? 'Waiting to sync. Your record is safe on this device.' : '';

  return <>
    <Screen archetype="root" testID="checkin-hub">
      <View style={{ gap: spacing.lg }}>
        <PageHeader title="Check In" subtitle={dateLabel} />
        {local.isLoading || history.isLoading ? <SkeletonCard lines={4} /> : <Card style={{ gap: spacing.base }}>
          <Text variant="h2">{title}</Text>
          {detail ? <Text tone="muted">{detail}</Text> : null}
          <Button label={pending || saved ? 'View today’s record' : draft?.date === today ? 'Continue check-in' : 'Check in for today'} onPress={() => open(today)} testID="checkin-start" />
        </Card>}
        {draft && draft.date !== today ? <Card style={{ gap: spacing.sm }}>
          <Text variant="h2">An earlier draft</Text>
          <Text variant="bodySm" tone="muted">Your check-in for {draft.date} is saved on this device.</Text>
          <Button label="Continue saved draft" variant="secondary" onPress={() => open(draft.date)} />
        </Card> : null}
        {local.isError ? <ErrorState title="Saved records are unavailable" message="Retry before starting another check-in to recover any unfinished draft." onRetry={() => { void local.refetch(); }} /> : null}
        {history.isError ? <Text variant="bodySm" tone="muted">Recent synced records are unavailable. You can open a day to recover its local record.</Text> : null}
        <View style={{ gap: spacing.xs }}>
          <Text variant="h2">Your history</Text>
          <Text tone="muted">Review a previous day or fill in a missed check-in.</Text>
          <Button label="Browse check-in history" variant="text" onPress={() => setHistoryVisible(true)} />
        </View>
      </View>
    </Screen>
    <CheckInDateHistorySheet visible={historyVisible} processed={processed} localRecords={localDays} onClose={() => setHistoryVisible(false)} onSelectDay={open} />
  </>;
}
