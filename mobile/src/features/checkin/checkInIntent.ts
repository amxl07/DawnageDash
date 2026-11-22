export type CheckInIntent = { kind: 'date' | 'exit'; run: () => Promise<boolean> };
/** One replaceable, identity-scoped transition, replayable after recovery exactly once. */
export function createCheckInIntentQueue(isActive: (date: string) => boolean) {
  const queue: {
    current: CheckInIntent | null;
    clear: () => void;
    replace: (kind: CheckInIntent['kind'], date: string, work: (isCurrent: () => boolean) => Promise<boolean>) => CheckInIntent;
  } = {
    current: null,
    clear: () => { queue.current = null; },
    replace: (kind, date, work) => {
      let running: Promise<boolean> | null = null;
      let completed = false;
      const isCurrent = () => !completed && queue.current === intent && isActive(date);
      const intent: CheckInIntent = { kind, run: () => {
        if (running) return running;
        if (!isCurrent()) return Promise.resolve(false);
        const operation = Promise.resolve().then(() => isCurrent() ? work(isCurrent) : false).then((success) => {
          if (success) { completed = true; if (queue.current === intent) queue.current = null; }
          return success;
        }).finally(() => { running = null; });
        running = operation;
        return operation;
      } };
      queue.current = intent;
      return intent;
    },
  };
  return queue;
}
