import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useUserProfile } from '@/hooks/usePlans';
import { mergeProfileData } from '@/lib/profile-data';
import { supabase } from '@/lib/supabase';
import { detectTimezone } from '@/lib/timezones';
import { hydrateSetup, nextSetupMilestone, type PrimaryGoal, type SetupStageIndex, type SetupValues } from './setup-model';

export type { PrimaryGoal, SetupStageIndex, SetupValues } from './setup-model';

export function useSetupController() {
  const { user } = useAuth();
  const profile = useUserProfile();
  const milestone = useOnboarding();
  const cache = useQueryClient();
  const [stage, setStage] = useState<SetupStageIndex>(0);
  const [values, setValues] = useState<SetupValues>(() => hydrateSetup(null, detectTimezone()));
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef<string | null>(null);
  const currentUser = useRef(user?.id);
  currentUser.current = user?.id;
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (!user?.id || profile.data === undefined || milestone.isLoading || milestone.isError || hydrated.current === user.id) return;
    hydrated.current = user.id;
    setValues(hydrateSetup(profile.data?.profile_data, detectTimezone()));
    setStage(Math.min(2, Math.max(0, milestone.step)) as SetupStageIndex);
    setError(null);
  }, [user?.id, profile.data, milestone.step, milestone.isLoading, milestone.isError]);

  const continueSetup = useCallback(async (): Promise<boolean> => {
    const userId = user?.id;
    if (!userId || hydrated.current !== userId || inFlight.current || !values.primaryGoal) return false;
    inFlight.current = true;
    setSaving(true); setError(null);
    const active = () => mounted.current && currentUser.current === userId;
    try {
      const { data: current, error: readError } = await supabase.from('users').select('profile_data,onboarding_step').eq('id', userId).single();
      if (readError) throw readError;
      if (!active()) return false;
      const next = nextSetupMilestone(current.onboarding_step ?? 0, stage);
      const patch = { primary_goal: values.primaryGoal, timezone: values.timezone };
      const { data: saved, error: writeError } = await supabase.from('users').update({ profile_data: mergeProfileData(current.profile_data, patch), onboarding_step: next }).eq('id', userId).select('*').single();
      if (writeError) throw writeError;
      if (!active()) return false;
      cache.setQueryData(['userProfile', userId], saved);
      cache.setQueryData(['onboardingStep', userId], next);
      if (stage < 2) setStage((stage + 1) as SetupStageIndex);
      return true;
    } catch {
      if (active()) setError('Your choices are still here. Check your connection and try again.');
      return false;
    } finally {
      inFlight.current = false;
      if (active()) setSaving(false);
    }
  }, [cache, stage, user?.id, values]);

  return {
    stage, values, isSaving, error,
    loading: profile.isLoading || milestone.isLoading || (hydrated.current !== user?.id && !profile.isError),
    loadError: profile.isError || milestone.isError,
    retry: () => { void profile.refetch(); void milestone.refetch(); },
    setGoal: (primaryGoal: PrimaryGoal) => { if (!inFlight.current) setValues((previous) => ({ ...previous, primaryGoal })); },
    setTimezone: (timezone: string) => { if (!inFlight.current) setValues((previous) => ({ ...previous, timezone })); },
    back: () => { if (!inFlight.current) { setStage((previous) => Math.max(0, previous - 1) as SetupStageIndex); setError(null); } },
    editGoal: () => { if (!inFlight.current) setStage(0); },
    continue: continueSetup,
  };
}
