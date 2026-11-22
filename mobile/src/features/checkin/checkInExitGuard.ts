/** Shared by tab presses and notification pushes while the check-in editor is focused. */
let guard: ((replay: () => void) => Promise<boolean>) | null = null;
let pending: Promise<void> | null = null;
export function registerCheckInExitGuard(next: (replay: () => void) => Promise<boolean>): () => void {
  guard = next;
  return () => { if (guard === next) guard = null; };
}
export function hasCheckInExitGuard(): boolean { return guard !== null; }
export function requestCheckInTabExit(navigate: () => void): Promise<void> {
  if (pending) return pending;
  const current = guard;
  let replayed = false;
  const replay = () => {
    if (replayed || (current && guard !== current)) return;
    replayed = true;
    navigate();
  };
  const operation = (async () => { if (!current || await current(replay)) replay(); })();
  pending = operation;
  void operation.finally(() => { if (pending === operation) pending = null; }).catch(() => {});
  return operation;
}
