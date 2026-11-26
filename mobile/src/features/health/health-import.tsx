import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Keyboard, Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import type { CheckInEditor } from '@/features/checkin/useCheckInEditor';
import { useNumericCommits } from '@/features/checkin/components/NumericCommitProvider';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';
import { currentTimezone, sameReviewScope, type HealthReviewScope } from './health-model';
import { createHealthReview, type HealthReviewState } from './health-review';
import { HealthReviewSheet } from './health-review-sheet';
import { readHealthDay } from './health-service';

/** Mount keyed to account/date. This review does not persist or submit native data. */
export function HealthImport({ editor, accountId, beforeOpen, onApplied, disabled = false }: { editor: CheckInEditor; accountId: string; beforeOpen: () => boolean; onApplied: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const commits = useNumericCommits();
  const triggerRef = useRef<View>(null);
  const live = useRef({ editor, accountId, beforeOpen, onApplied, disabled });
  live.current = { editor, accountId, beforeOpen, onApplied, disabled };
  const mounted = useRef(true);
  const [state, setState] = useState<HealthReviewState>({ stage: 'closed', scope: null, result: null, selected: [], error: null });
  const [review] = useState(() => {
    const capture = (): HealthReviewScope | null => {
      const current = live.current;
      if (!mounted.current || current.disabled || current.editor.loadState !== 'ready' || current.editor.isSubmitting || commits?.hasPending()) return null;
      return { identity: current.editor.getSnapshot, accountId: current.accountId, date: current.editor.date, timezone: currentTimezone(), revision: current.editor.getRevision(), form: current.editor.getSnapshot() };
    };
    return createHealthReview({
      capture,
      flush: () => live.current.beforeOpen(),
      read: readHealthDay,
      onChange: next => { if (mounted.current) setState(next); },
      apply: (expected, values) => {
        let applied = false;
        live.current.editor.updateForm(previous => {
          // updateForm invokes this synchronously against the current editor scope.
          if (!sameReviewScope(expected, capture())) return previous;
          applied = true;
          return { ...previous, ...values };
        });
        if (applied) {
          live.current.onApplied();
          AccessibilityInfo.announceForAccessibility('Selected health values added. Review and complete your check-in before submitting.');
        }
        return applied;
      },
    });
  });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; review.close(); };
  }, [review]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      const scope = review.getState().scope;
      if (next === 'active' && scope && scope.timezone !== currentTimezone()) review.close();
    });
    return () => subscription.remove();
  }, [review]);
  return <>
    <Pressable ref={triggerRef} accessibilityRole="button" accessibilityLabel="Import from health app" accessibilityHint="Review weight, steps and food intake before choosing values for this check-in." accessibilityState={{ disabled }} disabled={disabled} onPress={disabled ? undefined : () => { if (review.open()) Keyboard.dismiss(); }} style={({ pressed }) => ({ minWidth: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: pressed && !disabled ? colors.pressed : 'transparent' })}>
      <Text variant="bodySm" style={{ color: disabled ? colors.mutedForeground : colors.foreground }}>Import from health app</Text>
    </Pressable>
    <HealthReviewSheet state={state} onRead={() => { void review.read(); }} onClose={() => review.close()} onToggle={review.toggle} onApply={() => { review.apply(); }} returnFocusRef={triggerRef} />
  </>;
}
