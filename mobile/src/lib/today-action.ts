import type { Href } from 'expo-router';

export type TodayActionKind = 'check-in' | 'review-update' | 'open-plan' | 'review-progress' | 'resume-workout' | 'resume-checkin';

export type TodayAction = {
  kind: TodayActionKind;
  title: string;
  detail: string;
  route: Href;
};

export function resolveTodayAction(input: {
  today: string;
  checkedInToday: boolean;
  hasWorkoutPlan: boolean;
  planChanged: boolean;
  workoutDraft?: { date: string; logId: string | null } | null;
  checkInDraft?: { date: string } | null;
  queuedCheckInToday?: boolean;
  blockedCheckInToday?: boolean;
  blockedRecord?: { date: string; route: Href } | null;
  nextPlanDay?: number | null;
}): TodayAction {
  const todayCheckIn: Href = { pathname: '/(app)/(tabs)/check-in', params: { date: input.today } };
  const labelDate = (date: string) => {
    const value = new Date(date + 'T12:00:00');
    return Number.isFinite(value.getTime())
      ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(value)
      : date;
  };
  if (input.workoutDraft) {
    return {
      kind: 'resume-workout', title: 'Pick up where you left off',
      detail: 'Your workout from ' + labelDate(input.workoutDraft.date) + ' is saved on this device.',
      route: { pathname: '/(app)/logger', params: { date: input.workoutDraft.date, ...(input.workoutDraft.logId ? { logId: input.workoutDraft.logId } : {}) } },
    };
  }
  if (input.checkInDraft) {
    return {
      kind: 'resume-checkin', title: 'A moment to finish your day',
      detail: 'Continue your record for ' + labelDate(input.checkInDraft.date) + '.',
      route: { pathname: '/(app)/(tabs)/check-in', params: { date: input.checkInDraft.date } },
    };
  }
  if (input.blockedRecord) {
    return { kind: 'review-progress', title: 'Your record needs attention', detail: 'Your record for ' + labelDate(input.blockedRecord.date) + ' is saved on this device. Open it to review and retry.', route: input.blockedRecord.route };
  }
  if (input.blockedCheckInToday) {
    return { kind: 'review-progress', title: 'Your record needs attention', detail: 'Saved on this device. Open your check-in to review and retry it.', route: todayCheckIn };
  }
  if (!input.checkedInToday && !input.queuedCheckInToday) {
    return {
      kind: 'check-in',
      title: 'Your daily check-in',
      detail: 'Take a moment to reflect. Build a clear record of your day.',
      route: todayCheckIn,
    };
  }

  if (input.planChanged) {
    return {
      kind: 'review-update',
      title: 'Review your updated plan',
      detail: 'Your training plan was updated.',
      route: '/(app)/(tabs)/plans',
    };
  }

  if (input.hasWorkoutPlan && input.nextPlanDay !== null) {
    return {
      kind: 'open-plan',
      title: input.nextPlanDay ? 'Your next session is ready' : 'Your training plan is ready',
      detail: 'Take a look at your plan and train when you are ready.',
      route: input.nextPlanDay && Number.isInteger(input.nextPlanDay) && input.nextPlanDay > 0
        ? { pathname: '/(app)/logger', params: { day: String(input.nextPlanDay) } }
        : '/(app)/(tabs)/plans',
    };
  }

  return {
    kind: 'review-progress',
    title: input.queuedCheckInToday ? 'Your record is waiting to sync' : 'Your day is recorded',
    detail: input.queuedCheckInToday ? 'Saved on this device. You can review it while delivery is pending.' : 'Revisit your record whenever you need to.',
    route: todayCheckIn,
  };
}
