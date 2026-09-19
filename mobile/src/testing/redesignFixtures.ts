/** Fictional development/test records. Never imported by production routes. */
import data from './redesignFixtures.json';
import type { UserProfile, PlanDay } from '@/hooks/usePlans';
import type { DailyCheckIn, BodyMeasurement } from '@/types/db';

export const fixtureUserId = data.userId;
export const fixtureProfile: UserProfile = data.profile;
export const fixtureDailyCheckIn: DailyCheckIn = data.checkIns[0];
export const fixtureCheckIns: DailyCheckIn[] = data.checkIns;
export const fixtureMeasurements: BodyMeasurement[] = data.measurements;
export const fixturePlanDays: PlanDay[] = data.planDays;
export const fixtureWorkoutContent = data.workoutContent;
export const redesignFixtures = data;
