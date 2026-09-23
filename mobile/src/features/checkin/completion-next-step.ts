/** A completion action must not bypass unfinished work or imply a workout is due. */
export function checkInCompletionDestination(input: {
  date: string;
  today: string;
  status: 'queued' | 'synced';
  assignedPlanReady: boolean;
  localReady: boolean;
  hasRecovery: boolean;
}): 'home' | 'training' {
  return input.date === input.today && input.status === 'synced' && input.assignedPlanReady && input.localReady && !input.hasRecovery
    ? 'training' : 'home';
}
