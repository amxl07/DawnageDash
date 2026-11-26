import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useCoach } from '@/hooks/useCoach';
import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { useUserProfile, useWorkoutPlan } from '@/hooks/usePlans';
import { weeklyReportingWindow } from '@/features/weekly/selectors';
import { useWeeklyFeedbackHistory } from '@/features/weekly/useWeeklyFeedbackHistory';
import { questionnaireSections, parseAnswers, validCompletedSections } from '@/lib/questionnaire-data';
import { supabase } from '@/lib/supabase';
import { parseWorkoutContent } from '@/lib/workout-content';
import type { HomeData, HomeSection, HomeWorkoutRecord } from './types';
import { homePlanSection } from './home-state';

function section<T>(query: UseQueryResult<T>): HomeSection<T> {
  const retry = () => { void query.refetch(); };
  // Invalidation retains cached rows. Empty rows cannot prove absence while
  // their replacement is fetching or paused offline. Keep errors separate.
  if (query.data !== undefined) return { state: 'ready', data: query.data, stale: query.isError, refreshing: query.isFetching || query.fetchStatus === 'paused', retry };
  if (query.isError) return { state: 'error', retry };
  return { state: 'loading' };
}

export function useHomeData(today: string): HomeData {
  const { user } = useAuth();
  const profile = useUserProfile();
  const checkIns = useDailyCheckIns();
  const plan = useWorkoutPlan();
  const coach = useCoach();
  const weeklyFeedback = useWeeklyFeedbackHistory();
  const { from: weekStart } = weeklyReportingWindow(today);
  const assessment = useQuery({
    queryKey: ['homeAssessment', user?.id], enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('onboarding_questionnaire').select('answers, completed_sections').eq('user_id', user!.id).maybeSingle();
      if (error) throw error;
      const completed: unknown = data?.completed_sections ? JSON.parse(data.completed_sections) : [];
      if (!Array.isArray(completed)) throw new Error('Assessment progress is unavailable');
      const ids = new Set(questionnaireSections.map((entry) => entry.id));
      return { completed: validCompletedSections(parseAnswers(data?.answers), completed.filter((id): id is string => typeof id === 'string'), questionnaireSections).length, total: ids.size };
    },
  });
  const workouts = useQuery({
    queryKey: ['workoutLogs', user?.id, 'home-week-records', weekStart, today], enabled: Boolean(user?.id),
    queryFn: async (): Promise<HomeWorkoutRecord[]> => {
      const { data, error } = await supabase.from('workout_logs').select('id,date,content').eq('user_id', user!.id).gte('date', weekStart).lte('date', today);
      if (error) throw error;
      return data ?? [];
    },
  });
  const workoutSection = section(workouts);
  // A partially logged plan day still advances the existing next-session
  // selector. The recap applies its stricter completion rule separately.
  const loggedDays = new Set<number>();
  for (const row of workouts.data ?? []) {
    const parsed = parseWorkoutContent(row.content);
    if (parsed.kind === 'exercises' && parsed.version === 2 && parsed.planDayNumber && parsed.planDayNumber > 0) loggedDays.add(parsed.planDayNumber);
  }
  const loggedPlanDays: HomeData['loggedPlanDays'] = workoutSection.state === 'ready'
    ? { ...workoutSection, data: [...loggedDays] } : workoutSection;
  const refetches = useRef<(() => void)[]>([]);
  refetches.current = [profile, checkIns, plan, coach, assessment, workouts, weeklyFeedback].map((query) => () => { void query.refetch(); });
  const refresh = useCallback(() => refetches.current.forEach((refetch) => refetch()), []);
  const firstFocus = useRef(true);
  useFocusEffect(useCallback(() => {
    if (firstFocus.current) { firstFocus.current = false; return; }
    refresh();
  }, [refresh]));
  return {
    profile: section(profile), checkIns: section(checkIns), coach: section(coach),
    plan: homePlanSection(section(profile), section(plan)),
    weeklyFeedback: section(weeklyFeedback),
    assessment: section(assessment), loggedPlanDays, workouts: workoutSection, refresh,
    refreshing: checkIns.isRefetching || plan.isRefetching || profile.isRefetching || workouts.isRefetching,
  };
}
