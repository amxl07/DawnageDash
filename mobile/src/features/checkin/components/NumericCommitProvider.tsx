import { createContext, useCallback, useContext, useMemo, useRef } from 'react';

export type NumericCommitOptions = { preserveEditing?: boolean };
type Commit = (options?: NumericCommitOptions) => boolean;
type Adapter = { read: () => number | null; replace: (value: number | null) => void; focus?: () => void };
type EditEvent = { pending: number; edited: boolean };
type Entry = { commit: Commit; adapter?: Adapter };
type NumericCommits = {
  register: (id: string, commit: Commit, adapter?: Adapter) => () => void;
  subscribe: (listener: (event: EditEvent) => void) => () => void;
  stage: (id: string) => void;
  settle: (id: string) => void;
  hasPending: (id?: string) => boolean;
  flush: (options?: NumericCommitOptions) => boolean;
  replace: (id: string, value: number | null) => { applied: true; previous: number | null } | { applied: false } | null;
  reset: (values: Record<string, number | null>) => void;
  canMove: (id: string, direction: -1 | 1) => boolean;
  move: (id: string, direction: -1 | 1) => 'moved' | 'end' | 'invalid';
};
const Context = createContext<NumericCommits | null>(null);

/**
 * Staging notifies the controller synchronously, before a raw text edit can race
 * acknowledgment. Commit sinks must also update a synchronous form snapshot.
 * This API does not flush React renders or make ordinary useState values current.
 */
export function NumericCommitProvider({ children }: { children: React.ReactNode }) {
  const entries = useRef(new Map<string, Entry>());
  const pending = useRef(new Set<string>());
  const listeners = useRef(new Set<(event: EditEvent) => void>());
  const notify = useCallback((edited: boolean) => {
    for (const listener of listeners.current) listener({ pending: pending.current.size, edited });
  }, []);
  const settle = useCallback((id: string) => { if (pending.current.delete(id)) notify(false); }, [notify]);
  const register = useCallback((id: string, commit: Commit, adapter?: Adapter) => {
    const entry = { commit, adapter };
    entries.current.set(id, entry);
    return () => {
      if (entries.current.get(id) !== entry) return;
      entries.current.delete(id);
      settle(id);
    };
  }, [settle]);
  const subscribe = useCallback((listener: (event: EditEvent) => void) => {
    listeners.current.add(listener);
    listener({ pending: pending.current.size, edited: false });
    return () => { listeners.current.delete(listener); };
  }, []);
  const stage = useCallback((id: string) => { pending.current.add(id); notify(true); }, [notify]);
  const hasPending = useCallback((id?: string) => id ? pending.current.has(id) : pending.current.size > 0, []);
  const flush = useCallback((options?: NumericCommitOptions) => {
    let valid = true;
    for (const { commit } of entries.current.values()) {
      if (!commit(options)) {
        valid = false;
        if (!options?.preserveEditing) break;
      }
    }
    return valid;
  }, []);
  const replace = useCallback((id: string, value: number | null) => {
    const entry = entries.current.get(id);
    if (!entry?.adapter) return null;
    if (!entry.commit()) return { applied: false as const };
    const previous = entry.adapter.read();
    entry.adapter.replace(value);
    settle(id);
    return { applied: true as const, previous };
  }, [settle]);
  const reset = useCallback((values: Record<string, number | null>) => {
    for (const [id, entry] of entries.current) {
      if (id in values) entry.adapter?.replace(values[id]);
    }
    pending.current.clear();
    notify(false);
  }, [notify]);
  const neighbor = useCallback((id: string, direction: -1 | 1) => {
    const focusable = [...entries.current].filter(([, entry]) => entry.adapter?.focus);
    const index = focusable.findIndex(([key]) => key === id);
    return index < 0 ? undefined : focusable[index + direction]?.[1];
  }, []);
  const canMove = useCallback((id: string, direction: -1 | 1) => Boolean(neighbor(id, direction)), [neighbor]);
  const move = useCallback((id: string, direction: -1 | 1) => {
    const current = entries.current.get(id);
    if (!current) return 'end' as const;
    if (!current.commit()) return 'invalid' as const;
    const next = neighbor(id, direction);
    if (!next) return 'end' as const;
    next.adapter?.focus?.();
    return 'moved' as const;
  }, [neighbor]);
  const value = useMemo(() => ({ register, subscribe, stage, settle, hasPending, flush, replace, reset, canMove, move }), [register, subscribe, stage, settle, hasPending, flush, replace, reset, canMove, move]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useNumericCommits() { return useContext(Context); }
