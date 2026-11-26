import { Check, CircleAlert, ClipboardCheck, Clock3 } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';

import { RecordStatus, Text } from '@/components/ui';
import { MotionReveal } from '@/components/ui/MotionReveal';
import { spacing, useTheme } from '@/theme';

type CompletionState = 'review' | 'sending' | 'synced' | 'queued' | 'blocked';

/** A quiet acknowledgement; only delivery transitions animate, never tab entry. */
export function CompletionHeader({ title, eyebrow, state, detail, revision = 0, testID, showStatus = true }: {
  title: string;
  eyebrow: string;
  state: CompletionState;
  detail?: string;
  showStatus?: boolean;
  revision?: number;
  testID?: string;
}) {
  const { colors } = useTheme();
  const Icon = state === 'synced' ? Check : state === 'blocked' ? CircleAlert : state === 'queued' || state === 'sending' ? Clock3 : ClipboardCheck;
  const color = state === 'blocked' ? colors.destructive : state === 'synced' ? colors.success : colors.primary;
  const receipt = state === 'synced' || state === 'queued' || state === 'blocked';
  const previousState = useRef(state);
  useEffect(() => {
    if (!showStatus && receipt && previousState.current !== state && Platform.OS !== 'web') {
      AccessibilityInfo.announceForAccessibility(title);
    }
    previousState.current = state;
  }, [receipt, showStatus, state, title]);
  return <MotionReveal revision={`${state}:${revision}`} testID={testID}>
    <View style={{ gap: spacing.base }}>
      {eyebrow ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View accessible={false} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
          <Icon size={24} color={color} accessible={false} />
        </View>
        <Text variant="label" tone="muted" style={{ flex: 1 }}>{eyebrow}</Text>
      </View> : null}
      <Text variant="h1" accessibilityLiveRegion={!showStatus && Platform.OS === 'web' ? 'polite' : undefined}>{title}</Text>
      {receipt && showStatus ? <RecordStatus value={state} /> : null}
      {detail ? <Text variant="bodySm" tone="muted">{detail}</Text> : null}
    </View>
  </MotionReveal>;
}

/** Rows wrap for large text rather than squeezing values into metric tiles. */
export function CompletionValue({ label, value, detail }: { label: string; value: string; detail?: string }) {
  const { colors } = useTheme();
  return <View accessible accessibilityLabel={`${label}: ${value}${detail ? ` ${detail}` : ''}`}
    style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.xs }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm }}>
      <Text variant="bodySm" tone="muted">{label}</Text>
      <Text variant="bodySm" numeric>{value}</Text>
    </View>
    {detail ? <Text variant="caption" tone="muted">{detail}</Text> : null}
  </View>;
}
