export type SurfaceLinks = { checkIn: string; training: string; workout: string };
export type RestClock = { endsAt: number | null; pausedRemainingMs: number | null };
export type WorkoutProgress = { exerciseIndex: number; exerciseCount: number; completedSets: number; totalSets: number };
export type ActivityProps = {
  exercise: number; exerciseCount: number; completedSets: number; totalSets: number;
  restEndsAt: number | null; restStartedAt: number; pausedRemainingMs: number | null;
};
export type NativeActivity = {
  getId: () => string;
  update: (props: ActivityProps, staleDate: Date) => Promise<void>;
  end: (policy: 'immediate') => Promise<void>;
};
export type NativeSurfaceAdapter = {
  initialize: (links: SurfaceLinks) => void;
  getInstances: () => NativeActivity[] | Promise<NativeActivity[]>;
  start: (props: ActivityProps, url: string, staleDate: Date) => NativeActivity | Promise<NativeActivity>;
};

export function nativeSurfaceLinks(scheme: string | string[] | undefined): SurfaceLinks | null {
  const value = Array.isArray(scheme) ? scheme[0] : scheme;
  if (!value || !/^[a-z][a-z0-9+.-]*$/i.test(value)) return null;
  return { checkIn: `${value}:///daily-check-in`, training: `${value}:///plans`, workout: `${value}:///logger` };
}

export function canUseNativeSurfaces(input: { platform: string; version: number | string; expoGo: boolean; binary: boolean }) {
  return input.platform === 'ios' && Number.parseFloat(String(input.version)) >= 16.2 && !input.expoGo && input.binary;
}

export function workoutIsLive(input: { date: string; today: string; ready: boolean; existingLogId: string | null; outboxId?: string; delivery: string; source: string | null }) {
  return input.ready && input.date === input.today && !input.existingLogId && !input.outboxId && input.delivery === 'idle' && input.source !== null && input.source !== 'server';
}

/** Native content deliberately excludes titles, exercise names, IDs and measurements. */
export function activityContent(progress: WorkoutProgress, rest: RestClock, now: number) {
  const count = (value: number) => Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  const totalSets = count(progress.totalSets);
  const exerciseCount = count(progress.exerciseCount);
  const restEndsAt = rest.endsAt !== null && Number.isFinite(rest.endsAt) && rest.endsAt > now ? rest.endsAt : null;
  const pausedRemainingMs = rest.pausedRemainingMs !== null && Number.isFinite(rest.pausedRemainingMs) && rest.pausedRemainingMs > 0 ? rest.pausedRemainingMs : null;
  const props: ActivityProps = {
    exercise: exerciseCount ? Math.min(count(progress.exerciseIndex) + 1, exerciseCount) : 0,
    exerciseCount, completedSets: Math.min(count(progress.completedSets), totalSets), totalSets,
    restEndsAt, restStartedAt: now, pausedRemainingMs: restEndsAt === null ? pausedRemainingMs : null,
  };
  // Rest expires at its actual end, including while JS is suspended. Other
  // progress becomes explicitly stale after fifteen unattended minutes.
  return { props, staleDate: new Date(restEndsAt ?? now + 15 * 60_000) };
}
