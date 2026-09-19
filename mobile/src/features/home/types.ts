import type { CoachLookup } from '@/hooks/useCoach';
import type { PlanDay, UserProfile } from '@/hooks/usePlans';
import type { WeeklyCheckIn } from '@/lib/weekly-feedback';
import type { DailyCheckIn } from '@/types/db';

export type HomeSection<T> =
  | { state: 'loading' }
  | { state: 'error'; retry: () => void }
  | { state: 'ready'; data: T; stale: boolean; retry: () => void };

export type RecordDay = {
  date: string;
  state: 'absent' | 'draft' | 'queued' | 'synced' | 'blocked';
};

export type HomeData = {
  profile: HomeSection<UserProfile | null>;
  checkIns: HomeSection<DailyCheckIn[]>;
  weeklyFeedback: HomeSection<WeeklyCheckIn[]>;
  plan: HomeSection<{ days: PlanDay[]; source: 'user' | 'template' | 'none' }>;
  coach: HomeSection<CoachLookup>;
  assessment: HomeSection<{ completed: number; total: number }>;
  loggedPlanDays: HomeSection<number[]>;
  refresh: () => void;
  refreshing: boolean;
};

export type RecentRecordSummary = {
  from: string;
  to: string;
  sleep: { value: number | null; samples: number };
  latestWeight: { value: number; date: string } | null;
  weightPoints: { value: number | null; date: string }[];
};
