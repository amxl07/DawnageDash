import { useCallback, useEffect, useRef } from "react";

interface DraftData {
  workoutTitle: string;
  exercises: any[];
  selectedPlanId: string;
  existingLogId: string | null;
  savedAt: number;
}

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function getDraftKey(userId: string, date: string): string {
  return `workout-draft:${userId}:${date}`;
}

export function useWorkoutDraft(userId: string | undefined, dateKey: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (data: Omit<DraftData, "savedAt">) => {
      if (!userId) return;
      // Debounce writes by 500ms
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        try {
          const draft: DraftData = { ...data, savedAt: Date.now() };
          sessionStorage.setItem(getDraftKey(userId, dateKey), JSON.stringify(draft));
        } catch {
          // sessionStorage full or unavailable — silently ignore
        }
      }, 500);
    },
    [userId, dateKey]
  );

  const loadDraft = useCallback((): DraftData | null => {
    if (!userId) return null;
    try {
      const raw = sessionStorage.getItem(getDraftKey(userId, dateKey));
      if (!raw) return null;
      const draft: DraftData = JSON.parse(raw);
      if (Date.now() - draft.savedAt > DRAFT_EXPIRY_MS) {
        sessionStorage.removeItem(getDraftKey(userId, dateKey));
        return null;
      }
      return draft;
    } catch {
      return null;
    }
  }, [userId, dateKey]);

  const clearDraft = useCallback(() => {
    if (!userId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    try {
      sessionStorage.removeItem(getDraftKey(userId, dateKey));
    } catch {
      // ignore
    }
  }, [userId, dateKey]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { saveDraft, loadDraft, clearDraft };
}
