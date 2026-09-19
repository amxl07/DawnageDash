import type { DraftData } from '@/hooks/useWorkoutDraft';

export type WorkoutScope = { userId: string; date: string; logId: string | null };
export type WorkoutEntry =
  | { kind: 'loading' }
  | { kind: 'error'; reason: 'unavailable' | 'missing-log' | 'draft-unreadable' }
  | { kind: 'choose-log'; ids: string[] }
  | { kind: 'ready'; source: 'draft' | 'server' | 'plan' | 'blank' };

/** Resolve dependencies, never their arrival order. Explicit identities cannot fall through. */
export function resolveWorkoutEntry(input: {
  explicitLogId: string | null;
  records: { id: string }[] | undefined;
  recordsFailed: boolean;
  draft: DraftData | null | undefined;
  draftFailed: boolean;
  planReady: boolean;
  hasAssignedPlan: boolean;
}): WorkoutEntry {
  if (input.draftFailed) return { kind: 'error', reason: 'draft-unreadable' };
  if (input.recordsFailed) return { kind: 'error', reason: 'unavailable' };
  if (input.records === undefined || input.draft === undefined) return { kind: 'loading' };
  if (input.explicitLogId && !input.records.some((row) => row.id === input.explicitLogId)) {
    return { kind: 'error', reason: 'missing-log' };
  }
  if (!input.explicitLogId && input.records.length > 1) {
    return { kind: 'choose-log', ids: input.records.map((row) => row.id) };
  }
  if (input.draft && input.draft.existingLogId === input.explicitLogId) {
    return { kind: 'ready', source: 'draft' };
  }
  if (input.records.length) return { kind: 'ready', source: 'server' };
  if (!input.planReady) return { kind: 'loading' };
  return { kind: 'ready', source: input.hasAssignedPlan ? 'plan' : 'blank' };
}
